// ============================================================
// RICH ANSWER AI
// PDF TEXT EXTRACTION + TESSERACT OCR + PAGE-AWARE RAG
// ============================================================

const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const OpenAI = require("openai");
const pdfjs = require("pdfjs-dist");
const cosineSimilarity = require("cosine-similarity");

const {
    createCanvas
} = require("canvas");

const {
    createWorker
} = require("tesseract.js");


// ============================================================
// ENVIRONMENT
// ============================================================

dotenv.config();

const app = express();

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

if (fs.existsSync(workerPath)) {

    pdfjs.GlobalWorkerOptions.workerSrc =
        `file://${workerPath.replace(
            /\\/g,
            "/"
        )}`;

}


// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// ============================================================
// STATIC FRONTEND
// ============================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const uploadDir =
    path.join(
        __dirname,
        "uploads"
    );

if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );

}


// ============================================================
// MULTER
// ============================================================

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    uploadDir
                );

            },


        filename:
            function (
                req,
                file,
                cb
            ) {

                const safeName =
                    file.originalname
                        .replace(
                            /[^a-zA-Z0-9.-]/g,
                            "_"
                        );

                const filename =
                    `${Date.now()}-${safeName}`;

                cb(
                    null,
                    filename
                );

            }

    });


const upload =
    multer({

        storage:

            storage,

        limits: {

            // 20 MB upload limit
            fileSize:
                20 *
                1024 *
                1024

        },

        fileFilter:
            function (
                req,
                file,
                cb
            ) {

                const isPDF =
                    file.mimetype ===
                        "application/pdf" ||
                    path
                        .extname(
                            file.originalname
                        )
                        .toLowerCase() ===
                        ".pdf";


                if (!isPDF) {

                    return cb(
                        new Error(
                            "Only PDF files are allowed."
                        )
                    );

                }


                cb(
                    null,
                    true
                );

            }

    });


// ============================================================
// RAG GLOBAL DATA
// ============================================================

let manualText = "";

let uploadedFileName = "";

let manualChunks = [];

let chunkEmbeddings = [];


// ============================================================
// SETTINGS
// ============================================================

const MAX_PAGES =
    50000;


// Number of characters per chunk
const CHUNK_SIZE =
    1500;


// Number of chunks retrieved
const TOP_K =
    5;


// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(
    text
) {

    if (!text) {

        return "";

    }


    return text

        .replace(
            /\r/g,
            ""
        )

        .replace(
            /[ \t]+/g,
            " "
        )

        .replace(
            /\n{3,}/g,
            "\n\n"
        )

        .trim();

}


// ============================================================
// SPLIT TEXT INTO CHUNKS
// ============================================================

function splitTextIntoChunks(
    text,
    chunkSize = CHUNK_SIZE
) {

    const chunks = [];

    if (!text) {

        return chunks;

    }


    for (
        let i = 0;
        i < text.length;
        i += chunkSize
    ) {

        const chunk =
            text
                .substring(
                    i,
                    i + chunkSize
                )
                .trim();


        if (
            chunk.length > 0
        ) {

            chunks.push(
                chunk
            );

        }

    }


    return chunks;

}


// ============================================================
// CREATE PAGE-AWARE CHUNKS
// ============================================================

function createPageChunks(
    pages
) {

    const chunks = [];


    pages.forEach(
        (
            page,
            pageIndex
        ) => {

            const pageNumber =
                pageIndex + 1;


            const pageText =
                normalizeText(
                    page.text
                );


            if (
                !pageText
            ) {

                return;

            }


            const pageChunks =
                splitTextIntoChunks(
                    pageText
                );


            pageChunks.forEach(
                (
                    chunk
                ) => {

                    chunks.push({

                        text:
                            chunk,

                        page:
                            pageNumber

                    });

                }
            );

        }
    );


    return chunks;

}


// ============================================================
// PDF TEXT EXTRACTION
// ============================================================

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

    }).promise;


    return canvas;

}


// ============================================================
// TESSERACT OCR
// ============================================================

async function performTesseractOCR(
    filePath,
    startPage,
    endPage
) {

    console.log(
        "\n👁️ Starting Tesseract OCR..."
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


    const actualEndPage =
        Math.min(
            endPage,
            totalPages,
            MAX_PAGES
        );


    console.log(
        `👁️ OCR pages ${startPage} → ${actualEndPage}`
    );


    // Create ONE worker and reuse it
    // for all pages.

    const worker =
        await createWorker(
            "eng"
        );


    const ocrPages = [];


    try {

        for (
            let pageNumber =
                startPage;

            pageNumber <=
                actualEndPage;

            pageNumber++
        ) {

            try {

                console.log(
                    `👁️ OCR processing page ${pageNumber}/${actualEndPage}...`
                );


                // --------------------------------
                // RENDER PDF PAGE
                // --------------------------------

                const canvas =
                    await renderPDFPage(
                        pdfDoc,
                        pageNumber
                    );


                // --------------------------------
                // CONVERT CANVAS TO PNG
                // --------------------------------

                const imageBuffer =
                    canvas.toBuffer(
                        "image/png"
                    );


                // --------------------------------
                // TESSERACT
                // --------------------------------

                const result =
                    await worker.recognize(
                        imageBuffer
                    );


                const text =
                    result
                        .data
                        .text ||
                        "";


                ocrPages.push({

                    page:
                        pageNumber,

                    text:
                        normalizeText(
                            text
                        )

                });


                console.log(
                    `   ✅ Page ${pageNumber}: ${text.length} characters`
                );


            } catch (
                pageError
            ) {

                console.error(
                    `   ❌ OCR failed for page ${pageNumber}:`,
                    pageError.message
                );


                ocrPages.push({

                    page:
                        pageNumber,

                    text:
                        ""

                });

            }

        }


    } finally {

        console.log(
            "🧹 Closing Tesseract worker..."
        );


        await worker.terminate();

    }


    console.log(
        "✅ Tesseract OCR completed."
    );


    return ocrPages;

}


// ============================================================
// LOAD PDF FOR OCR
// ============================================================

async function performOCRForPDF(
    filePath
) {

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


    return await performTesseractOCR(
        filePath,
        1,
        pagesToProcess
    );

}


// ============================================================
// MOCK EMBEDDING
// ============================================================

function createMockEmbedding(
    text
) {

    const hash =
        text
            .split("")
            .reduce(
                (
                    value,
                    character
                ) => {

                    value =
                        (
                            (
                                value << 5
                            ) -
                            value
                        ) +
                        character.charCodeAt(
                            0
                        );

                    return (
                        value &
                        value
                    );

                },
                0
            );


    const embedding = [];


    for (
        let i = 0;
        i < 1536;
        i++
    ) {

        embedding.push(
            Math.sin(
                hash + i
            ) * 0.5
        );

    }


    return embedding;

}


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


        try {

            // ----------------------------------------
            // CHECK FILE
            // ----------------------------------------

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Please upload a PDF file."

                    });

            }


            filePath =
                req.file.path;


            uploadedFileName =
                req.file.originalname;


            console.log(
                "\n=============================================="
            );

            console.log(
                "📄 NEW PDF UPLOAD"
            );

            console.log(
                "=============================================="
            );

            console.log(
                "File:",
                uploadedFileName
            );


            // ----------------------------------------
            // EXTRACT NORMAL TEXT
            // ----------------------------------------

            const extraction =
                await extractTextFromPDF(
                    filePath
                );


            const totalPages =
                extraction.totalPages;


            const processedPages =
                extraction.processedPages;


            let pages =
                extraction.pages;


            // ----------------------------------------
            // CHECK IF TEXT PDF
            // ----------------------------------------

            let ocrUsed =
                false;


            const enoughText =
                hasEnoughText(
                    pages
                );


            // ----------------------------------------
            // OCR SCANNED PDF
            // ----------------------------------------

            if (!enoughText) {

                console.log(
                    "\n⚠️ This appears to be a scanned/image PDF."
                );


                console.log(
                    "👁️ Switching to Tesseract OCR..."
                );


                pages =
                    await performOCRForPDF(
                        filePath
                    );


                ocrUsed =
                    true;

            } else {

                console.log(
                    "✅ Text-based PDF detected."
                );

            }


            // ----------------------------------------
            // CALCULATE TEXT
            // ----------------------------------------

            let allText =
                "";


            pages.forEach(
                page => {

                    allText +=
                        page.text +
                        "\n";

                }
            );


            allText =
                normalizeText(
                    allText
                );


            manualText =
                allText;


            // ----------------------------------------
            // VALIDATE
            // ----------------------------------------

            if (
                manualText.length ===
                0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Could not extract text from this PDF, even after Tesseract OCR."

                    });

            }


            console.log(
                `📝 Final text length: ${manualText.length} characters`
            );


            // ----------------------------------------
            // CREATE PAGE-AWARE CHUNKS
            // ----------------------------------------

            console.log(
                "📚 Creating page-aware RAG chunks..."
            );


            manualChunks =
                createPageChunks(
                    pages
                );


            console.log(
                `📚 Created ${manualChunks.length} chunks.`
            );


            // ----------------------------------------
            // CREATE EMBEDDINGS
            // ----------------------------------------

            chunkEmbeddings =
                await createEmbeddings(
                    manualChunks
                );


            console.log(
                `🧠 Stored ${chunkEmbeddings.length} embeddings.`
            );


            // ----------------------------------------
            // DELETE TEMP PDF
            // ----------------------------------------

            try {

                fs.unlinkSync(
                    filePath
                );

                filePath =
                    null;

            } catch (
                deleteError
            ) {

                console.warn(
                    "⚠️ Could not delete temporary PDF."
                );

            }


            // ----------------------------------------
            // SUCCESS
            // ----------------------------------------

            console.log(
                "\n=============================================="
            );

            console.log(
                "🎉 PDF PROCESSING COMPLETE"
            );

            console.log(
                "=============================================="
            );


            res.json({

                success:
                    true,

                message:
                    "PDF uploaded and processed successfully.",

                fileName:
                    uploadedFileName,

                totalPages:
                    totalPages,

                processedPages:
                    processedPages,

                textLength:
                    manualText.length,

                chunks:
                    manualChunks.length,

                embeddings:
                    chunkEmbeddings.length,

                ocrUsed:
                    ocrUsed

            });


        } catch (
            error
        ) {

            console.error(
                "\n❌ UPLOAD ERROR"
            );

            console.error(
                error
            );


            if (
                filePath &&
                fs.existsSync(
                    filePath
                )
            ) {

                try {

                    fs.unlinkSync(
                        filePath
                    );

                } catch {}

            }


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

        });

    }
);


// ============================================================
// MULTER ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "❌ Middleware Error:",
            error.message
        );


        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "PDF file is too large. Maximum size is 20MB."

                    });

            }


            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        error.message

                });

        }


        if (error) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        error.message

                });

        }


        next();

    }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    () => {

        console.log(
            "\n=============================================="
        );

        console.log(
            "🚀 RICH ANSWER AI"
        );

        console.log(
            "=============================================="
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            `📄 Maximum pages: ${MAX_PAGES}`
        );

        console.log(
            "📦 Maximum upload: 20 MB"
        );

        console.log(
            "📖 PDF.js text extraction: READY"
        );

        console.log(
            "👁️ Tesseract OCR: READY"
        );

        console.log(
            "🖼️ PDF page rendering: READY"
        );

        console.log(
            "🧠 RAG embeddings: READY"
        );

        console.log(
            "📚 Page references: READY"
        );

        console.log(
            "==============================================\n"
        );

    }
);