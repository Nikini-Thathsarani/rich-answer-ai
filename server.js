const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const pdfParse = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Check API key
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing in .env");
    process.exit(1);
}

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Create uploads folder if it doesn't exist
const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" + file.originalname.replace(/\s+/g, "_");

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    fileFilter: function (req, file, cb) {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed."));
        }
    },

    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

// Store currently uploaded manual text
let manualText = "";
let uploadedFileName = "";

/*
---------------------------------------
TEST API
---------------------------------------
*/

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "Rich Answer AI server is running",
        ai: "OpenAI API connected"
    });
});

/*
---------------------------------------
PDF UPLOAD API
---------------------------------------
*/

app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a PDF file."
            });
        }

        console.log("📄 PDF uploaded:", req.file.originalname);

        // Read PDF
        const pdfBuffer = fs.readFileSync(req.file.path);

        // Extract text
        const pdfData = await pdfParse(pdfBuffer);

        manualText = pdfData.text;
        uploadedFileName = req.file.originalname;

        console.log("✅ PDF text extracted");
        console.log("Characters:", manualText.length);

        res.json({
            success: true,
            message: "PDF uploaded successfully.",
            fileName: uploadedFileName,
            pages: pdfData.numpages,
            characters: manualText.length
        });

    } catch (error) {
        console.error("PDF Error:", error);

        res.status(500).json({
            success: false,
            message: "Could not process PDF.",
            error: error.message
        });
    }
});

/*
---------------------------------------
ASK AI API
---------------------------------------
*/

app.post("/api/ask", async (req, res) => {
    try {
        const { question } = req.body;

        if (!question || question.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Please enter a question."
            });
        }

        if (!manualText) {
            return res.status(400).json({
                success: false,
                message: "Please upload a technical manual first."
            });
        }

        console.log("❓ Question:", question);

        /*
        Limit the manual text for this first version.
        Later we will replace this with RAG/vector search.
        */

        const context = manualText.substring(0, 50000);

        const prompt = `
You are Rich Answer AI, an AI assistant specialized in answering
questions about technical manuals.

Use the technical manual below as your primary source.

TECHNICAL MANUAL:
----------------
${context}
----------------

USER QUESTION:
${question}

Instructions:

1. Answer using information from the technical manual.
2. Do not invent technical information.
3. If the answer cannot be found in the manual, say:
   "I couldn't find this information in the uploaded technical manual."
4. Explain the answer clearly.
5. Use bullet points or numbered steps when appropriate.
6. If there are warnings or safety instructions in the manual,
   clearly mention them.
`;

        // OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",

            messages: [
                {
                    role: "system",
                    content: "You are a helpful technical manual assistant."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],

            temperature: 0.2
        });

        const answer = completion.choices[0].message.content;

        console.log("✅ AI answer generated");

        res.json({
            success: true,
            question: question,
            answer: answer
        });

    } catch (error) {
        console.error("OpenAI Error:", error);

        res.status(500).json({
            success: false,
            message: "AI could not generate an answer.",
            error: error.message
        });
    }
});

/*
---------------------------------------
DELETE CURRENT PDF
---------------------------------------
*/

app.delete("/api/reset", (req, res) => {
    manualText = "";
    uploadedFileName = "";

    res.json({
        success: true,
        message: "Manual removed."
    });
});

/*
---------------------------------------
ERROR HANDLER
---------------------------------------
*/

app.use((error, req, res, next) => {
    console.error(error);

    res.status(500).json({
        success: false,
        message: error.message
    });
});

/*
---------------------------------------
START SERVER
---------------------------------------
*/

app.listen(PORT, () => {
    console.log("");
    console.log("====================================");
    console.log("🚀 RICH ANSWER AI");
    console.log("====================================");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("🤖 OpenAI API: Connected");
    console.log("📄 PDF Processing: Enabled");
    console.log("====================================");
});