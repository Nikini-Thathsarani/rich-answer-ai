// ============================================================
// RICH ANSWER AI - SERVER
// PDF TEXT EXTRACTION + TESSERACT OCR + RAG + VISUAL PAGE RENDERING
// ============================================================

const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");
const cosineSimilarity = require("cosine-similarity");
const { createCanvas } = require("canvas");
const { createWorker } = require("tesseract.js");

<<<<<<< Updated upstream
const {
    createCanvas
} = require("canvas");

const {
    createWorker
} = require("tesseract.js");


// ============================================================
// ENVIRONMENT
// ============================================================

=======
// Load environment variables
>>>>>>> Stashed changes
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

<<<<<<< Updated upstream
const PORT =
    process.env.PORT || 3000;


// ============================================================
// OPENAI
// ============================================================

if (!process.env.OPENAI_API_KEY) {

    console.error(
        "❌ OPENAI_API_KEY is missing in .env"
    );

    process.exit(1);
}

const openai =
    new OpenAI({
        apiKey:
            process.env.OPENAI_API_KEY
    });


// ============================================================
// PDF.JS WORKER
// ============================================================

const workerPath =
    path.join(
        __dirname,
        "node_modules",
        "pdfjs-dist",
        "build",
        "pdf.worker.min.mjs"
    );

=======
// Configure PDF.js worker and fonts if available
const workerPath = path.join(__dirname, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs");
>>>>>>> Stashed changes
if (fs.existsSync(workerPath)) {
    pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath.replace(/\\/g, "/")}`;
}
const standardFontsUrl = path.join(__dirname, "node_modules", "pdfjs-dist", "standard_fonts").replace(/\\/g, "/") + "/";

// ============================================================
// OPENAI CLIENT SETUP
// ============================================================
let openai = null;
const rawKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : "";
const hasOpenAIKey = rawKey.length > 0 && !rawKey.includes("your_openai_api_key_here");

if (hasOpenAIKey) {
    try {
        openai = new OpenAI({ apiKey: rawKey });
        console.log("✅ OpenAI client initialized with API key.");
    } catch (err) {
        console.warn("⚠️ Error initializing OpenAI client:", err.message);
        openai = null;
    }
} else {
    console.log("ℹ️ OPENAI_API_KEY not configured. Running in Demo / Offline RAG Mode.");
    console.log("💡 To enable live GPT-4 answers and embeddings, add your key to .env");
}

// ============================================================
// STATE VARIABLES
// ============================================================
let manualText = "";
let uploadedFileName = "";
let totalPdfPages = 0;
let processedPdfPages = 0;
let isOcrUsed = false;
let manualPages = []; // [{ page: 1, text: "..." }]
let manualChunks = []; // [{ text: "...", page: 1, id: 0 }]
let chunkEmbeddings = []; // [[...]]
let activePdfPath = null;
const pageImageCache = new Map(); // pageNumber -> Buffer

const MAX_PAGES = 500;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const TOP_K = 4;

// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 30 * 1024 * 1024 // 30 MB
    },
    fileFilter: (req, file, cb) => {
        const isPdf =
            file.mimetype === "application/pdf" ||
            path.extname(file.originalname).toLowerCase() === ".pdf";
        if (!isPdf) {
            return cb(new Error("Only PDF files are allowed."));
        }
        cb(null, true);
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeText(text) {
    if (!text) return "";
    return text
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function splitTextIntoChunks(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    const chunks = [];
    if (!text) return chunks;

    let startIndex = 0;
    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize;

        // Try breaking at sentence or newline if within range
        if (endIndex < text.length) {
            const nextPeriod = text.indexOf(".", endIndex - 100);
            const nextNewline = text.indexOf("\n", endIndex - 100);
            const boundary = Math.max(nextPeriod, nextNewline);
            if (boundary > startIndex && boundary <= endIndex + 100) {
                endIndex = boundary + 1;
            }
        }

        const chunk = text.substring(startIndex, endIndex).trim();
        if (chunk.length > 20) {
            chunks.push(chunk);
        }

        startIndex = endIndex - overlap;
        if (startIndex >= text.length || endIndex >= text.length) break;
    }

    return chunks;
}

function createPageChunks(pages) {
    const chunks = [];
    let chunkId = 0;

    pages.forEach(page => {
        const cleanText = normalizeText(page.text);
        if (!cleanText) return;

        const subChunks = splitTextIntoChunks(cleanText);
        subChunks.forEach(text => {
            chunks.push({
                id: chunkId++,
                text: text,
                page: page.page
            });
        });
    });

    return chunks;
}

function hasEnoughText(pages) {
    let totalChars = 0;
    pages.forEach(p => {
        totalChars += normalizeText(p.text).length;
    });
    return totalChars >= 100;
}

// ============================================================
// PDF TEXT EXTRACTION
// ============================================================

<<<<<<< Updated upstream
async function extractTextFromPDF(
    filePath
) {

    console.log(
        "\n📖 Starting PDF text extraction..."
    );


    const pdfBuffer =
        fs.readFileSync(
            filePath
        );


    const uint8Array =
        new Uint8Array(
            pdfBuffer
        );


    const pdfDoc =
        await pdfjs
            .getDocument({
                data:
                    uint8Array
            })
            .promise;


    const totalPages =
        pdfDoc.numPages;


    const pagesToProcess =
        Math.min(
            totalPages,
            MAX_PAGES
        );


    console.log(
        `📄 Total PDF pages: ${totalPages}`
    );


    console.log(
        `📄 Pages to process: ${pagesToProcess}`
    );


    const pages = [];


    for (
        let i = 1;
        i <= pagesToProcess;
        i++
    ) {

        try {

            const page =
                await pdfDoc.getPage(
                    i
                );


            const textContent =
                await page.getTextContent();


            const pageText =
                textContent.items
                    .map(
                        item =>
                            item.str
                    )
                    .join(" ");


            pages.push({

                page:
                    i,

                text:
                    pageText

            });


            if (
                i % 10 === 0 ||
                i === pagesToProcess
            ) {

                console.log(
                    `📖 Text extracted: ${i}/${pagesToProcess} pages`
                );

            }


        } catch (
            error
        ) {

            console.error(
                `⚠️ Could not extract page ${i}:`,
                error.message
            );


            pages.push({

                page:
                    i,

                text:
                    ""

            });

        }

    }


    return {

        totalPages:
            totalPages,

        processedPages:
            pagesToProcess,

        pages:
            pages

    };

}


// ============================================================
// CHECK WHETHER PDF HAS REAL TEXT
// ============================================================

function hasEnoughText(
    pages
) {

    let totalCharacters =
        0;


    pages.forEach(
        page => {

            totalCharacters +=
                normalizeText(
                    page.text
                ).length;

        }
    );


    console.log(
        `📝 Extracted characters: ${totalCharacters}`
    );


    // If there is enough selectable text,
    // consider it a text PDF.

    return (
        totalCharacters >= 100
    );

}


// ============================================================
// RENDER PDF PAGE TO IMAGE
// ============================================================

async function renderPDFPage(
    pdfDoc,
    pageNumber
) {

    const page =
        await pdfDoc.getPage(
            pageNumber
        );


    // Higher scale = better OCR
    const viewport =
        page.getViewport({
            scale:
                2.0
        });


    const canvas =
        createCanvas(
            Math.ceil(
                viewport.width
            ),
            Math.ceil(
                viewport.height
            )
        );


    const context =
        canvas.getContext(
            "2d"
        );


    await page.render({

        canvasContext:
            context,

        viewport:
            viewport

=======
async function extractTextFromPDF(filePath) {
    console.log("📖 Starting PDF text extraction...");
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfDoc = await pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        standardFontDataUrl: standardFontsUrl
>>>>>>> Stashed changes
    }).promise;

    const totalPages = pdfDoc.numPages;
    const pagesToProcess = Math.min(totalPages, MAX_PAGES);
    const pages = [];

    for (let i = 1; i <= pagesToProcess; i++) {
        try {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");

            pages.push({
                page: i,
                text: pageText
            });
        } catch (err) {
            console.warn(`⚠️ Could not extract text from page ${i}: ${err.message}`);
            pages.push({ page: i, text: "" });
        }
    }

    return { totalPages, processedPages: pagesToProcess, pages };
}

// ============================================================
// PDF PAGE RENDERING (FOR VISUAL SCHEMATICS / DIAGRAMS / TABLES)
// ============================================================

async function renderPDFPage(filePath, pageNumber, scale = 1.5) {
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfDoc = await pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        standardFontDataUrl: standardFontsUrl
    }).promise;

    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
        throw new Error(`Invalid page number ${pageNumber}. Document has ${pdfDoc.numPages} pages.`);
    }

    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    // White background
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    return canvas;
}

// ============================================================
// TESSERACT OCR (FOR SCANNED / IMAGE-ONLY MANUALS)
// ============================================================

async function performOCRForPDF(filePath, maxPages = 20) {
    console.log("👁️ Starting Tesseract OCR for scanned PDF...");
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfDoc = await pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        standardFontDataUrl: standardFontsUrl
    }).promise;
    const totalPages = Math.min(pdfDoc.numPages, maxPages);

    const worker = await createWorker("eng");
    const ocrPages = [];

    try {
        for (let i = 1; i <= totalPages; i++) {
            console.log(`👁️ OCR processing page ${i}/${totalPages}...`);
            try {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport }).promise;
                const imageBuffer = canvas.toBuffer("image/png");

                const result = await worker.recognize(imageBuffer);
                const text = normalizeText(result.data.text || "");
                ocrPages.push({ page: i, text: text });
            } catch (err) {
                console.error(`❌ OCR failed for page ${i}:`, err.message);
                ocrPages.push({ page: i, text: "" });
            }
        }
    } finally {
        await worker.terminate();
    }

    return ocrPages;
}

// ============================================================
// EMBEDDING UTILITIES
// ============================================================

function createMockEmbedding(text) {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    const embedding = new Array(1536).fill(0);

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let hash = 0;
        for (let j = 0; j < word.length; j++) {
            hash = ((hash << 5) - hash + word.charCodeAt(j)) | 0;
        }
        const index = Math.abs(hash) % 1536;
        embedding[index] += 1.0;
        embedding[(index * 31 + 7) % 1536] += 0.5;
    }

    // Normalize vector
    let norm = 0;
    for (let i = 0; i < 1536; i++) {
        norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let i = 0; i < 1536; i++) {
            embedding[i] /= norm;
        }
    }

    return embedding;
}

async function createEmbeddings(chunks) {
    if (!chunks.length) return [];
    console.log(`🧠 Generating embeddings for ${chunks.length} chunks...`);

<<<<<<< Updated upstream
// ============================================================
// CREATE OPENAI EMBEDDINGS
// ============================================================

async function createEmbeddings(
    chunks
) {

    console.log(
        `🧠 Creating embeddings for ${chunks.length} chunks...`
    );


    const embeddings = [];


    const batchSize =
        20;


    try {

        for (
            let i = 0;
            i < chunks.length;
            i += batchSize
        ) {

            const batch =
                chunks.slice(
                    i,
                    i + batchSize
                );


            const response =
                await openai
                    .embeddings
                    .create({

                        model:
                            "text-embedding-3-small",

                        input:
                            batch.map(
                                item =>
                                    item.text
                            )

                    });


            response.data.forEach(
                item => {

                    embeddings.push(
                        item.embedding
                    );

                }
            );


            console.log(
                `   🧠 Embedded ${Math.min(
                    i + batchSize,
                    chunks.length
                )}/${chunks.length}`
            );

        }


        console.log(
            "✅ Embeddings completed."
        );


        return embeddings;


    } catch (
        error
    ) {

        console.error(
            "❌ Embedding error:",
            error.message
        );


        // Testing fallback
        if (
            error.status === 429 ||
            error.code ===
                "insufficient_quota" ||
            error.code ===
                "credit_balance_exhausted"
        ) {

            console.log(
                "🧪 Using mock embeddings."
            );


            return chunks.map(
                chunk =>
                    createMockEmbedding(
                        chunk.text
                    )
            );

        }


        throw error;

    }

}


// ============================================================
// QUESTION EMBEDDING
// ============================================================

async function createQuestionEmbedding(
    question
) {

    try {

        const response =
            await openai
                .embeddings
                .create({

                    model:
                        "text-embedding-3-small",

                    input:
                        question

                });


        return response
            .data[0]
            .embedding;


    } catch (
        error
    ) {

        console.error(
            "❌ Question embedding error:",
            error.message
        );


        if (
            error.status === 429 ||
            error.code ===
                "insufficient_quota" ||
            error.code ===
                "credit_balance_exhausted"
        ) {

            console.log(
                "🧪 Using mock question embedding."
            );


            return createMockEmbedding(
                question
            );

        }


        throw error;

    }

}


// ============================================================
// HOME
// ============================================================

app.get(
    "/",
    (
        req,
        res
    ) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


// ============================================================
// TEST API
// ============================================================

app.get(
    "/api/test",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            message:
                "Rich Answer AI server is working!"

        });

    }
);


// ============================================================
// STATUS API
// ============================================================

app.get(
    "/api/status",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            uploaded:
                manualText.length > 0,

            fileName:
                uploadedFileName ||
                null,

            textLength:
                manualText.length,

            chunks:
                manualChunks.length,

            embeddings:
                chunkEmbeddings.length,

            maxPages:
                MAX_PAGES

        });

    }
);


// ============================================================
// UPLOAD PDF
// ============================================================

app.post(
    "/api/upload",

    upload.single("pdf"),

    async (
        req,
        res
    ) => {

        let filePath =
            null;


=======
    if (openai) {
>>>>>>> Stashed changes
        try {
            const embeddings = [];
            const batchSize = 25;
            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const response = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: batch.map(c => c.text)
                });
                response.data.forEach(item => embeddings.push(item.embedding));
            }
            console.log("✅ OpenAI embeddings generated successfully.");
            return embeddings;
        } catch (err) {
            console.warn("⚠️ OpenAI embedding API call failed:", err.message);
            console.log("🧪 Falling back to local semantic vector embeddings.");
        }
    }

    // Mock embedding fallback
    return chunks.map(chunk => createMockEmbedding(chunk.text));
}

async function createQuestionEmbedding(question) {
    if (openai) {
        try {
            const res = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: question
            });
            return res.data[0].embedding;
        } catch (err) {
            console.warn("⚠️ Question embedding error:", err.message);
        }
    }
    return createMockEmbedding(question);
}

// ============================================================
// API ROUTES
// ============================================================

// Status check
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        uploaded: manualChunks.length > 0,
        fileName: uploadedFileName || null,
        totalPages: totalPdfPages,
        processedPages: processedPdfPages,
        textLength: manualText.length,
        chunks: manualChunks.length,
        embeddings: chunkEmbeddings.length,
        ocrUsed: isOcrUsed,
        hasOpenAIKey: Boolean(openai),
        mode: openai ? "openai" : "demo"
    });
});

// Test connection
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Rich Answer AI server is running!",
        hasOpenAIKey: Boolean(openai)
    });
});

// Upload and process PDF
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid PDF file to upload."
            });
        }

        filePath = req.file.path;
        uploadedFileName = req.file.originalname;

        console.log(`\n==============================================`);
        console.log(`📄 NEW PDF UPLOAD: ${uploadedFileName}`);
        console.log(`==============================================`);

        // Clean previous caches
        pageImageCache.clear();
        if (activePdfPath && activePdfPath !== filePath && fs.existsSync(activePdfPath)) {
            try { fs.unlinkSync(activePdfPath); } catch {}
        }
        activePdfPath = filePath;

        // Step 1: Extract Text
        const extraction = await extractTextFromPDF(filePath);
        totalPdfPages = extraction.totalPages;
        processedPdfPages = extraction.processedPages;
        let pages = extraction.pages;

        // Step 2: Check if scanned PDF requiring OCR
        isOcrUsed = false;
        if (!hasEnoughText(pages)) {
            console.log("⚠️ Scanned PDF detected (minimal text). Initiating OCR...");
            pages = await performOCRForPDF(filePath, 20);
            isOcrUsed = true;
        }

        manualPages = pages;
        manualText = pages.map(p => p.text).join("\n\n");

        if (!manualText || manualText.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Could not extract readable text from this PDF."
            });
        }

        // Step 3: Chunking
        manualChunks = createPageChunks(pages);
        console.log(`📚 Created ${manualChunks.length} page-aware chunks.`);

        // Step 4: Embeddings
        chunkEmbeddings = await createEmbeddings(manualChunks);

        res.json({
            success: true,
            message: "Manual uploaded and indexed successfully!",
            fileName: uploadedFileName,
            totalPages: totalPdfPages,
            processedPages: processedPdfPages,
            textLength: manualText.length,
            chunks: manualChunks.length,
            ocrUsed: isOcrUsed,
            mode: openai ? "openai" : "demo"
        });
    } catch (err) {
        console.error("❌ Upload processing error:", err);
        if (filePath && fs.existsSync(filePath) && activePdfPath !== filePath) {
            try { fs.unlinkSync(filePath); } catch {}
        }
        res.status(500).json({
            success: false,
            message: err.message || "Failed to process manual."
        });
    }
});

// Render and serve a specific page as a PNG image
app.get("/api/page/:pageNumber", async (req, res) => {
    try {
        const pageNumber = parseInt(req.params.pageNumber, 10);
        if (!activePdfPath || !fs.existsSync(activePdfPath)) {
            return res.status(404).send("No manual currently uploaded.");
        }

        if (isNaN(pageNumber) || pageNumber < 1) {
            return res.status(400).send("Invalid page number.");
        }

        // Check memory cache
        if (pageImageCache.has(pageNumber)) {
            res.type("image/png");
            return res.send(pageImageCache.get(pageNumber));
        }

        // Render page
        const scale = req.query.scale ? parseFloat(req.query.scale) : 1.5;
        const canvas = await renderPDFPage(activePdfPath, pageNumber, scale);
        const imageBuffer = canvas.toBuffer("image/png");

        // Cache up to 30 recent pages
        if (pageImageCache.size > 30) {
            const firstKey = pageImageCache.keys().next().value;
            pageImageCache.delete(firstKey);
        }
        pageImageCache.set(pageNumber, imageBuffer);

        res.type("image/png");
        res.send(imageBuffer);
    } catch (err) {
        console.error(`❌ Page render error for page ${req.params.pageNumber}:`, err.message);
        res.status(500).send("Failed to render page image.");
    }
});

// Get text of a specific page
app.get("/api/page-text/:pageNumber", (req, res) => {
    const pageNum = parseInt(req.params.pageNumber, 10);
    const found = manualPages.find(p => p.page === pageNum);
    if (!found) {
        return res.status(404).json({ success: false, message: "Page not found." });
    }
    res.json({
        success: true,
        page: pageNum,
        text: found.text
    });
});

// Ask questions about the manual
app.post("/api/ask", async (req, res) => {
    try {
        const question = (req.body.question || "").trim();

        if (!question) {
            return res.status(400).json({
                success: false,
                message: "Please enter a question."
            });
        }

        if (!manualChunks.length) {
            return res.status(400).json({
                success: false,
                message: "Please upload a technical manual PDF first."
            });
        }

        console.log(`💬 Processing Question: "${question}"`);

        // Compute Question Embedding
        const questionEmbedding = await createQuestionEmbedding(question);

        // Score Chunks via Cosine Similarity
        const scoredChunks = manualChunks.map((chunk, idx) => {
            const emb = chunkEmbeddings[idx];
            let score = 0;
            if (emb && questionEmbedding) {
                try {
                    score = cosineSimilarity(questionEmbedding, emb);
                } catch {}
            }
<<<<<<< Updated upstream


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        error.message ||
                        "Failed to process PDF."

                });

        }

    }
);


// ============================================================
// ASK QUESTION
// ============================================================

app.post(
    "/api/ask",

    async (
        req,
        res
    ) => {

        try {

            const question =
                req.body.question;


            // ----------------------------------------
            // VALIDATE QUESTION
            // ----------------------------------------

            if (
                !question ||
                !question.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Please enter a question."

                    });

            }


            // ----------------------------------------
            // CHECK MANUAL
            // ----------------------------------------

            if (
                manualChunks.length ===
                0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Please upload a PDF first."

                    });

            }


            console.log(
                `\n💬 Question: ${question}`
            );


            // ----------------------------------------
            // QUESTION EMBEDDING
            // ----------------------------------------

            const questionEmbedding =
                await createQuestionEmbedding(
                    question
                );


            // ----------------------------------------
            // CALCULATE SIMILARITY
            // ----------------------------------------

            const scoredChunks =
                manualChunks.map(
                    (
                        chunk,
                        index
                    ) => {

                        const embedding =
                            chunkEmbeddings[
                                index
                            ];


                        let score =
                            0;


                        if (
                            embedding
                        ) {

                            score =
                                cosineSimilarity(
                                    questionEmbedding,
                                    embedding
                                );

                        }


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


            // ----------------------------------------
            // SORT
            // ----------------------------------------

            scoredChunks.sort(
                (
                    a,
                    b
                ) =>
                    b.score -
                    a.score
            );


            // ----------------------------------------
            // TOP K
            // ----------------------------------------

            const topChunks =
                scoredChunks.slice(
                    0,
                    TOP_K
                );


            // ----------------------------------------
            // CREATE CONTEXT
            // ----------------------------------------

            let context =
                "";


            topChunks.forEach(
                (
                    chunk,
                    index
                ) => {

                    context +=
                        `

SOURCE ${index + 1}

PAGE:
${chunk.page}

RELEVANCE:
${chunk.score.toFixed(4)}

CONTENT:
${chunk.text}

--------------------------------
`;

                }
            );


            // ----------------------------------------
            // AI ANSWER
            // ----------------------------------------

            let answer =
                "";


            let testingMode =
                false;


            try {

                const completion =
                    await openai
                        .chat
                        .completions
                        .create({

                            model:
                                "gpt-4o-mini",

                            temperature:
                                0.2,

                            messages: [

                                {

                                    role:
                                        "system",

                                    content:
                                        `
You are Rich Answer AI.

You answer questions about uploaded technical manuals.

STRICT RULES:

1. Use ONLY the provided manual context.

2. Do not invent information.

3. Do not use outside knowledge.

4. If the answer cannot be found in the context, say:
"I couldn't find this information in the uploaded manual."

5. Give clear and accurate answers.

6. Use numbered steps when explaining procedures.

7. Use bullet points when appropriate.

8. Do not mention embeddings.

9. Do not mention similarity scores.

10. Do not mention the RAG implementation.

11. Preserve technical terminology.

12. If the context contains a procedure, explain it in the correct order.

13. If the question asks about a specific page/topic, use the relevant source content.
`

                                },

                                {

                                    role:
                                        "user",

                                    content:
                                        `
USER QUESTION:

${question}


MANUAL CONTEXT:

${context}


Answer the question using ONLY the manual context.
`

                                }

                            ]

                        });


                answer =
                    completion
                        .choices[0]
                        .message
                        .content;


            } catch (
                chatError
            ) {

                console.error(
                    "❌ OpenAI chat error:",
                    chatError.message
                );


                if (
                    chatError.status ===
                        429 ||
                    chatError.code ===
                        "insufficient_quota" ||
                    chatError.code ===
                        "credit_balance_exhausted"
                ) {

                    testingMode =
                        true;


                    const fallbackText =
                        topChunks
                            .slice(
                                0,
                                2
                            )
                            .map(
                                chunk =>
                                    `Page ${chunk.page}:\n${chunk.text}`
                            )
                            .join(
                                "\n\n"
                            );


                    answer =
                        `
**Testing Mode**

⚠️ Real OpenAI answer generation is unavailable because the API currently has no available credits.

Relevant information found in the manual:

${fallbackText}
`;

                } else {

                    throw chatError;

                }

            }


            // ----------------------------------------
            // SOURCE PAGES
            // ----------------------------------------

            const sourcePages =
                [
                    ...new Set(

                        topChunks

                            .filter(
                                chunk =>
                                    chunk.page !==
                                    null &&
                                    chunk.page !==
                                    undefined
                            )

                            .map(
                                chunk =>
                                    chunk.page
                            )

                    )
                ].sort(
                    (
                        a,
                        b
                    ) =>
                        a - b
                );


            // ----------------------------------------
            // SOURCE DETAILS
            // ----------------------------------------

            const sources =
                topChunks.map(
                    chunk => ({

                        page:
                            chunk.page,

                        score:
                            Number(
                                chunk.score.toFixed(
                                    4
                                )
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


            // ----------------------------------------
            // RESPONSE
            // ----------------------------------------

            res.json({

                success:
                    true,

                answer:
                    answer,

                sourcePages:
                    sourcePages,

                sources:
                    sources,

                fileName:
                    uploadedFileName,

                testingMode:
                    testingMode

            });


        } catch (
            error
        ) {

            console.error(
                "❌ ASK ERROR:",
                error
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        error.message ||
                        "Failed to generate answer."

                });

        }

    }
);


// ============================================================
// RESET
// ============================================================

app.delete(
    "/api/reset",

    (
        req,
        res
    ) => {

        manualText =
            "";

        uploadedFileName =
            "";

        manualChunks =
            [];

        chunkEmbeddings =
            [];


        console.log(
            "🗑️ Manual data cleared."
        );


        res.json({

            success:
                true,

            message:
                "Manual data reset successfully."

=======
            return {
                text: chunk.text,
                page: chunk.page,
                score: isNaN(score) ? 0 : score
            };
>>>>>>> Stashed changes
        });

        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.slice(0, TOP_K);

        // Gather source pages
        const sourcePages = [...new Set(topChunks.map(c => c.page).filter(Boolean))].sort((a, b) => a - b);

        let answer = "";
        let isTestingMode = false;

        // Build Context
        const context = topChunks
            .map((c, i) => `[SOURCE ${i + 1} - PAGE ${c.page} (Relevance: ${(c.score * 100).toFixed(1)}%)]\n${c.text}`)
            .join("\n\n-------------------------\n\n");

        if (openai) {
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    temperature: 0.2,
                    messages: [
                        {
                            role: "system",
                            content: `You are Rich Answer AI, an expert technical assistant for manuals.
Your job is to answer user questions with maximum precision, clarity, and depth based STRICTLY on the provided manual context.

GUIDELINES:
1. Ground every statement in the provided manual context.
2. Structure answers with clear headings, bullet points, and numbered steps for procedures.
3. Explicitly reference the relevant page numbers where procedures or components are described.
4. Highlight warnings, safety notices, torque values, dimensions, and component part numbers when mentioned.
5. If the context does not contain the answer, say: "I couldn't find this information in the uploaded manual."
6. Do not fabricate or use outside knowledge not found in the text.`
                        },
                        {
                            role: "user",
                            content: `USER QUESTION:\n${question}\n\nMANUAL EXCERPTS:\n${context}\n\nProvide a comprehensive, well-structured answer with page citations.`
                        }
                    ]
                });

                answer = completion.choices[0].message.content;
            } catch (chatError) {
                console.warn("⚠️ OpenAI chat completion error:", chatError.message);
                isTestingMode = true;
            }
        } else {
            isTestingMode = true;
        }

        // Extractive fallback when OpenAI is not available or quota exceeded
        if (isTestingMode) {
            const topMatch = topChunks[0];
            const relevantExcerpts = topChunks
                .slice(0, 3)
                .map(c => `**Page ${c.page}:**\n> ${c.text.replace(/\n+/g, " ").substring(0, 320)}...`)
                .join("\n\n");

            answer = `### 📋 Extracted Manual Information

${relevantExcerpts}

---
💡 *Note: Running in Demo / Offline RAG Mode based on local semantic matching. Add an \`OPENAI_API_KEY\` to your \`.env\` file for full GPT-4 syntheses.*`;
        }

        res.json({
            success: true,
            answer: answer,
            sourcePages: sourcePages,
            sources: topChunks.map(c => ({
                page: c.page,
                score: Number(c.score.toFixed(4)),
                previewUrl: `/api/page/${c.page}`
            })),
            fileName: uploadedFileName,
            testingMode: isTestingMode
        });
    } catch (err) {
        console.error("❌ Ask error:", err);
        res.status(500).json({
            success: false,
            message: err.message || "Failed to generate answer."
        });
    }
});

// Reset manual data
app.delete("/api/reset", (req, res) => {
    manualText = "";
    uploadedFileName = "";
    totalPdfPages = 0;
    processedPdfPages = 0;
    manualPages = [];
    manualChunks = [];
    chunkEmbeddings = [];
    pageImageCache.clear();

    if (activePdfPath && fs.existsSync(activePdfPath)) {
        try { fs.unlinkSync(activePdfPath); } catch {}
        activePdfPath = null;
    }

    console.log("🗑️ Manual data reset successfully.");
    res.json({
        success: true,
        message: "Manual data and caches reset successfully."
    });
});

// Multer & General Error Handling
app.use((err, req, res, next) => {
    console.error("❌ Middleware error:", err.message);
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File exceeds 30MB size limit."
            });
        }
    }
    res.status(400).json({
        success: false,
        message: err.message || "An unexpected error occurred."
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 RICH ANSWER AI SERVER ONLINE`);
    console.log(`==============================================`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`🔑 AI Engine: ${hasOpenAIKey ? "OpenAI Live (gpt-4o-mini)" : "Demo / Local Semantic RAG"}`);
    console.log(`🖼️ Visual Page Renderer: READY (/api/page/:num)`);
    console.log(`👁️ Tesseract OCR: READY`);
    console.log(`==============================================\n`);
});

module.exports = app;
