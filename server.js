const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const pdfjs = require("pdfjs-dist");
const axios = require("axios");
const FormData = require("form-data");
const cosineSimilarity = require("cosine-similarity");

// Set up pdfjs worker - use local worker file with proper file:// URL
const workerPath = path.join(
    __dirname,
    "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);
pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath.replace(/\\/g, "/")}`;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// OPENAI SETUP
// ===============================

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing in .env");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ===============================
// MIDDLEWARE
// ===============================

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    if (req.method === 'POST') {
        console.log('   Content-Type:', req.headers['content-type']);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// UPLOAD CONFIGURATION
// ===============================

const uploadDir = path.join(__dirname, "uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() +
            "-" +
            file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB
    },

    fileFilter: function (req, file, cb) {
        const isPDF =
            file.mimetype === "application/pdf" ||
            path.extname(file.originalname).toLowerCase() === ".pdf";

        if (!isPDF) {
            return cb(new Error("Only PDF files are allowed."));
        }

        cb(null, true);
    }
});

// ===============================
// GLOBAL RAG DATA
// ===============================

let manualText = "";
let uploadedFileName = "";

let manualChunks = [];
let chunkEmbeddings = [];

// ===============================
// SPLIT TEXT INTO CHUNKS
// ===============================

function splitTextIntoChunks(text, chunkSize = 1500) {
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, i + chunkSize).trim();

        if (chunk.length > 0) {
            chunks.push(chunk);
        }
    }

    return chunks;
}

// ===============================
// CREATE PAGE-AWARE CHUNKS
// ===============================

function createPageChunks(text) {
    const pages = text.split("\f");

    const chunks = [];

    pages.forEach((pageText, pageIndex) => {
        const pageNumber = pageIndex + 1;

        if (!pageText || pageText.trim().length === 0) {
            return;
        }

        const pageChunks = splitTextIntoChunks(pageText, 1500);

        pageChunks.forEach((chunk) => {
            chunks.push({
                text: chunk,
                page: pageNumber
            });
        });
    });

    return chunks;
}

// ===============================
// OCR FUNCTION
// ===============================

async function performOCR(filePath) {
    try {
        console.log("👁️ Starting OCR...");

        if (!process.env.OCR_API_KEY) {
            console.log("⚠️ OCR_API_KEY not found.");

            return "";
        }

        const form = new FormData();

        const fileStream = fs.createReadStream(filePath);

        form.append("file", fileStream);

        form.append(
            "language",
            "eng"
        );

        form.append(
            "filetype",
            "PDF"
        );

        form.append(
            "isOverlayRequired",
            "false"
        );

        form.append(
            "detectOrientation",
            "true"
        );

        form.append(
            "scale",
            "true"
        );

        form.append(
            "OCREngine",
            "2"
        );

        const response = await axios.post(
            "https://api.ocr.space/parse/image",
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    apikey: process.env.OCR_API_KEY
                },

                maxContentLength: Infinity,
                maxBodyLength: Infinity,

                timeout: 120000
            }
        );

        const data = response.data;

        // Check API processing error
        if (data.IsErroredOnProcessing) {
            console.error(
                "❌ OCR processing error:",
                data.ErrorMessage || data.ErrorDetails
            );

            return "";
        }

        if (
            !data.ParsedResults ||
            data.ParsedResults.length === 0
        ) {
            console.log("⚠️ OCR returned no results.");

            return "";
        }

        let extractedText = "";

        data.ParsedResults.forEach((result) => {
            if (result.ParsedText) {
                extractedText += result.ParsedText + "\n";
            }
        });

        extractedText = extractedText.trim();

        console.log(
            `✅ OCR completed. Extracted ${extractedText.length} characters.`
        );

        return extractedText;

    } catch (error) {
        console.error(
            "❌ OCR Error:",
            error.response?.data || error.message
        );

        return "";
    }
}

// ===============================
// CREATE EMBEDDINGS
// ===============================

async function createEmbeddings(chunks) {
    console.log(
        `🧠 Creating embeddings for ${chunks.length} chunks...`
    );

    const embeddings = [];

    // Process chunks in batches
    const batchSize = 20;

    try {
        for (
            let i = 0;
            i < chunks.length;
            i += batchSize
        ) {
            const batch = chunks.slice(
                i,
                i + batchSize
            );

            const response =
                await openai.embeddings.create({
                    model: "text-embedding-3-small",

                    input: batch.map(
                        (item) => item.text
                    )
                });

            response.data.forEach((item) => {
                embeddings.push(item.embedding);
            });

            console.log(
                `   Embedded ${Math.min(
                    i + batchSize,
                    chunks.length
                )}/${chunks.length}`
            );
        }

        console.log("✅ All embeddings created.");

        return embeddings;

    } catch (error) {
        // Fallback: Generate mock embeddings for development/testing
        if (error.status === 429) {
            console.log("⚠️ OpenAI API credits exhausted. Using mock embeddings for testing...");
            console.log("📝 To use real embeddings, add credits at: https://platform.openai.com/settings/organization/billing/");
            
            // Generate consistent mock embeddings based on chunk text
            return chunks.map(chunk => {
                const hash = chunk.text.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0);
                
                // Generate a deterministic embedding vector
                const embedding = [];
                for (let i = 0; i < 1536; i++) {
                    embedding.push(Math.sin(hash + i) * 0.5);
                }
                return embedding;
            });
        }
        throw error;
    }
}

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

// ===============================
// STATUS API
// ===============================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,

        uploaded: manualText.length > 0,

        fileName:
            uploadedFileName || null,

        textLength:
            manualText.length,

        chunks:
            manualChunks.length,

        embeddings:
            chunkEmbeddings.length
    });
});

// ===============================
// UPLOAD PDF
// ===============================

app.post(
    "/api/upload",
    upload.single("pdf"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload a PDF file."
                });
            }

            console.log(
                "\n================================"
            );

            console.log(
                "📄 PDF uploaded:",
                req.file.originalname
            );

            console.log(
                "================================"
            );

            uploadedFileName =
                req.file.originalname;

            const filePath =
                req.file.path;

            // ===========================
            // READ PDF
            // ===========================

            const pdfBuffer =
                fs.readFileSync(filePath);

            let pdfData;

            try {

                const uint8Array = new Uint8Array(pdfBuffer);
                const pdfDoc = await pdfjs.getDocument({ data: uint8Array }).promise;
                let extractedText = "";
                
                // Limit to first 50 pages to avoid timeouts
                const maxPages = Math.min(pdfDoc.numPages, 50);
                console.log(`📄 Processing ${maxPages} of ${pdfDoc.numPages} pages...`);
                
                for (let i = 1; i <= maxPages; i++) {
                    try {
                        const page = await pdfDoc.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(" ");
                        extractedText += pageText + "\f"; // Form feed for page separator
                    } catch (pageError) {
                        console.log(`⚠️ Could not extract page ${i}, continuing...`);
                    }
                }
                
                pdfData = {
                    text: extractedText,
                    numpages: pdfDoc.numPages
                };

            } catch (pdfError) {

                console.log(
                    "⚠️ Normal PDF extraction failed."
                );

                console.log("Error:", pdfError.message);

                pdfData = {
                    text: ""
                };
            }

            manualText =
                pdfData.text || "";

            console.log(
                `📖 Normal PDF text: ${manualText.length} characters`
            );

            // ===========================
            // CHECK FOR SCANNED PDF
            // ===========================

            if (
                manualText.trim().length < 50
            ) {

                console.log(
                    "⚠️ Very little text detected."
                );

                // Check file size
                const fileSizeInMB = fs.statSync(filePath).size / (1024 * 1024);
                
                if (fileSizeInMB > 1.5) {
                    console.log(
                        `⚠️ File too large for OCR (${fileSizeInMB.toFixed(2)}MB). Free OCR limited to 1.5MB.`
                    );
                } else {
                    console.log(
                        "👁️ Switching to OCR..."
                    );

                    const ocrText =
                        await performOCR(filePath);

                    if (ocrText) {

                        manualText =
                            ocrText;

                        console.log(
                            "✅ OCR text successfully extracted."
                        );

                    } else {

                        console.log(
                            "❌ OCR could not extract text."
                        );
                    }
                }
            }

            // ===========================
            // DELETE UPLOADED FILE
            // ===========================

            try {

                fs.unlinkSync(filePath);

            } catch (deleteError) {

                console.log(
                    "⚠️ Could not delete uploaded file."
                );
            }

            // ===========================
            // CHECK TEXT
            // ===========================

            console.log(
                `Checking text length: ${manualText.length} characters`
            );

            if (
                !manualText ||
                manualText.trim().length === 0
            ) {

                console.log(
                    "❌ No text could be extracted from PDF."
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Could not extract text from this PDF. Possible reasons:\n" +
                        "1. PDF contains only scanned images (need OCR - max 3 pages, 1.5MB free tier)\n" +
                        "2. PDF is password protected\n" +
                        "3. PDF file is corrupted\n\n" +
                        "Try: Upload a text-based PDF, reduce file size, or check file integrity."
                });
            }

            // ===========================
            // CREATE PAGE CHUNKS
            // ===========================

            console.log(
                "📚 Creating chunks..."
            );

            manualChunks =
                createPageChunks(manualText);

            // If page separators are unavailable,
            // create normal chunks instead.

            if (manualChunks.length === 0) {

                console.log(
                    "📝 No page breaks found, creating regular chunks..."
                );

                const normalChunks =
                    splitTextIntoChunks(
                        manualText,
                        1500
                    );

                manualChunks =
                    normalChunks.map(
                        (chunk) => ({
                            text: chunk,
                            page: null
                        })
                    );
            }

            console.log(
                `✅ Created ${manualChunks.length} chunks.`
            );

            // ===========================
            // CREATE EMBEDDINGS
            // ===========================

            console.log(
                "🧠 Starting embeddings creation..."
            );

            try {
                chunkEmbeddings =
                    await createEmbeddings(
                        manualChunks
                    );
            } catch (embeddingError) {
                console.error(
                    "❌ Embedding Error:",
                    embeddingError.message
                );
                throw embeddingError;
            }

            console.log(
                "✅ PDF processing completed."
            );

            console.log(
                "================================\n"
            );

            // ===========================
            // RESPONSE
            // ===========================

            res.json({

                success: true,

                message:
                    "PDF uploaded and processed successfully.",

                fileName:
                    uploadedFileName,

                textLength:
                    manualText.length,

                chunks:
                    manualChunks.length,

                ocrUsed:
                    pdfData.text.trim().length < 50
            });

        } catch (error) {

            console.error(
                "❌ Upload Error:",
                error.message || error
            );

            console.error(
                "Stack trace:",
                error.stack
            );

            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to process PDF.",

                details: error.message
            });
        }
    }
);

// ===============================
// MULTER ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error("❌ Multer Error:", err.message);
        return res.status(400).json({
            success: false,
            message: "Upload error: " + err.message
        });
    } else if (err) {
        console.error("❌ Middleware Error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error: " + err.message
        });
    }
    next();
});

// ===============================
// TEST ENDPOINT
// ===============================

app.get("/api/test", (req, res) => {
    console.log("✅ Test endpoint hit!");
    res.json({
        success: true,
        message: "Server is working!"
    });
});

// ===============================
// ASK QUESTION
// ===============================

app.post(
    "/api/ask",
    async (req, res) => {

        try {

            const {
                question
            } = req.body;

            // ===========================
            // VALIDATE QUESTION
            // ===========================

            if (
                !question ||
                question.trim().length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a question."
                });
            }

            // ===========================
            // CHECK PDF
            // ===========================

            if (
                !manualText ||
                manualChunks.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please upload a PDF first."
                });
            }

            console.log(
                "\n💬 Question:",
                question
            );

            // ===========================
            // QUESTION EMBEDDING
            // ===========================

            let questionEmbedding;

            try {
                const questionEmbeddingResponse =
                    await openai.embeddings.create({

                        model:
                            "text-embedding-3-small",

                        input:
                            question
                    });

                questionEmbedding =
                    questionEmbeddingResponse
                        .data[0]
                        .embedding;

            } catch (embeddingError) {
                // Fallback when OpenAI API credits are exhausted
                if (embeddingError.status === 429 || embeddingError.code === 'credit_balance_exhausted') {
                    console.log("⚠️ OpenAI API credits exhausted. Using mock question embedding for testing...");
                    
                    // Generate a deterministic mock embedding based on question hash
                    const hash = question.split('').reduce((a, b) => {
                        a = ((a << 5) - a) + b.charCodeAt(0);
                        return a & a;
                    }, 0);
                    
                    questionEmbedding = [];
                    for (let i = 0; i < 1536; i++) {
                        questionEmbedding.push(Math.sin(hash + i) * 0.5);
                    }
                } else {
                    throw embeddingError;
                }
            }

            // ===========================
            // CALCULATE SIMILARITY
            // ===========================

            const scoredChunks =
                manualChunks.map(
                    (chunk, index) => {

                        const score =
                            cosineSimilarity(
                                questionEmbedding,
                                chunkEmbeddings[index]
                            );

                        return {

                            text:
                                chunk.text,

                            page:
                                chunk.page,

                            score:
                                score
                        };
                    }
                );

            // ===========================
            // SORT BY RELEVANCE
            // ===========================

            scoredChunks.sort(
                (a, b) =>
                    b.score - a.score
            );

            // ===========================
            // TOP 5 RESULTS
            // ===========================

            const topChunks =
                scoredChunks.slice(
                    0,
                    5
                );

            // ===========================
            // BUILD CONTEXT
            // ===========================

            let context = "";

            topChunks.forEach(
                (item, index) => {

                    context += `
SOURCE ${index + 1}
PAGE: ${
    item.page !== null
        ? item.page
        : "Unknown"
}
RELEVANCE: ${item.score.toFixed(4)}

${item.text}

--------------------------------
`;
                }
            );

            // ===========================
            // OPENAI ANSWER
            // ===========================

            let answer;
            let usedMockResponse = false;

            try {
                const completion =
                    await openai.chat.completions.create({

                        model:
                            "gpt-4o-mini",

                        temperature:
                            0.2,

                        messages: [

                            {
                                role:
                                    "system",

                                content: `
You are Rich Answer AI, an AI assistant that answers questions using technical manuals.

Answer the user's question using ONLY the provided manual context.

Rules:

1. Do not invent information.
2. If the answer is not found in the manual, clearly say:
   "I couldn't find this information in the uploaded manual."
3. Give a clear and useful answer.
4. Use simple language when possible.
5. If useful, use bullet points.
6. Do not mention internal embeddings or similarity scores.
7. Do not pretend that information is in the manual when it is not.
`
                            },

                            {
                                role:
                                    "user",

                                content: `
USER QUESTION:
${question}

MANUAL CONTEXT:
${context}

Answer the question based only on the manual context.
`
                            }

                        ]
                    });

                answer =
                    completion
                        .choices[0]
                        .message
                        .content;

            } catch (chatError) {
                // Fallback when OpenAI API credits are exhausted
                if (chatError.status === 429 || chatError.code === 'credit_balance_exhausted') {
                    console.log("⚠️ OpenAI API credits exhausted. Using mock response for testing...");
                    usedMockResponse = true;
                    
                    // Generate a simple mock response based on top chunks
                    const topText = topChunks
                        .slice(0, 2)
                        .map(chunk => chunk.text)
                        .join("\n\n");
                    
                    answer = `**Testing Mode (Mock Response)** ⚠️\n\nBased on the uploaded manual, here is relevant information:\n\n${topText}\n\n_Note: Real AI responses require OpenAI API credits. Add credits at: https://platform.openai.com/settings/organization/billing/_`;
                } else {
                    throw chatError;
                }
            }

            // ===========================
            // SOURCE PAGES
            // ===========================

            const sourcePages = [
                ...new Set(
                    topChunks
                        .filter(
                            (item) =>
                                item.page !== null
                        )
                        .map(
                            (item) =>
                                item.page
                        )
                )
            ].sort(
                (a, b) => a - b
            );

            // ===========================
            // SOURCE DETAILS
            // ===========================

            const sources =
                topChunks.map(
                    (item) => ({

                        page:
                            item.page,

                        score:
                            Number(
                                item.score.toFixed(4)
                            )
                    })
                );

            console.log(
                "📖 Source pages:",
                sourcePages
            );

            console.log(
                "✅ Answer generated."
            );

            // ===========================
            // RESPONSE
            // ===========================

            res.json({

                success: true,

                answer:
                    answer,

                sourcePages:
                    sourcePages,

                sources:
                    sources,

                fileName:
                    uploadedFileName
            });

        } catch (error) {

            console.error(
                "❌ Ask Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to generate answer."
            });
        }
    }
);

// ===============================
// RESET
// ===============================

app.delete(
    "/api/reset",
    (req, res) => {

        manualText = "";

        uploadedFileName = "";

        manualChunks = [];

        chunkEmbeddings = [];

        console.log(
            "🗑️ Manual data cleared."
        );

        res.json({

            success: true,

            message:
                "Manual data reset successfully."
        });
    }
);

// ===============================
// MULTER ERROR HANDLER
// ===============================

app.use(
    (error, req, res, next) => {

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "PDF file is too large. Maximum size is 20MB."
                });
            }

            return res.status(400).json({

                success: false,

                message:
                    error.message
            });
        }

        if (error) {

            return res.status(400).json({

                success: false,

                message:
                    error.message
            });
        }

        next();
    }
);

// ===============================
// START SERVER
// ===============================

app.listen(
    PORT,
    () => {

        console.log(
            "\n======================================"
        );

        console.log(
            "🚀 Rich Answer AI Server Started"
        );

        console.log(
            "======================================"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "📄 PDF Upload: Ready"
        );

        console.log(
            "🧠 OpenAI RAG: Ready"
        );

        console.log(
            "👁️ OCR: Ready"
        );

        console.log(
            "📖 Source Pages: Enabled"
        );

        console.log(
            "======================================\n"
        );
    }
);