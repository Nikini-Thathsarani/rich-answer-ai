# Rich Answer AI 📘⚡

AI Assistant for Technical Manuals, Schematics, Diagrams, and Tables.

## 📖 About the Project

**Rich Answer AI** is an intelligent assistant designed specifically for complex technical manuals, machinery guides, schematics, and service documentation.

Unlike standard text-only chatbots, **Rich Answer AI** provides **rich, verified visual answers**:
- Combines semantic text retrieval (RAG) with high-resolution page rendering.
- Displays **visual schematics, diagrams, and tables** directly from the cited manual pages.
- Allows zooming and inspecting technical diagrams up close.
- Supports both native digital PDFs and scanned image-only PDFs via **Tesseract OCR**.
- Runs in **OpenAI Live Mode** (using `gpt-4o-mini` & `text-embedding-3-small`) or in **Offline / Demo Mode** (with local semantic matching without needing API credits).

---

## ✨ Features

- 📑 **Drag & Drop Manual Upload**: Upload PDF manuals up to 30 MB.
- 👁️ **Dual Text Extraction**:
  - High-speed native digital PDF extraction via `pdfjs-dist`.
  - Automatic fallback to `tesseract.js` OCR for scanned manuals.
- 🧠 **Page-Aware RAG**: Embeds manual chunks with exact page citations and cosine similarity retrieval.
- 🖼️ **Interactive Schematic & Diagram Viewer**: Click any source citation to view high-resolution page previews, schematics, and tables with full zoom controls (+/-) and pagination.
- 💡 **Quick Inquiry Chips**: One-click prompts for safety precautions, summaries, troubleshooting, and specs.
- 🛡️ **Zero-Crash Architecture**: Gracefully handles missing OpenAI keys, quota limits, or offline environments with built-in semantic fallback.

---

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3 (Modern Flexbox, Glassmorphism), Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **AI & RAG**: OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`), `cosine-similarity`
- **PDF & Computer Vision**: `pdfjs-dist` (legacy engine), `canvas` (node-canvas), `tesseract.js` (OCR)
- **Uploads**: `multer`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Add your OpenAI API key in `.env`:
```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
```
*(Note: If no API key is provided, the application will automatically run in local Demo / Offline RAG Mode).*

### 3. Start the Application
```bash
npm start
```
Then open your browser at:
```
http://localhost:3000
```

### 4. Run Automated Tests
```bash
npm test
```

---

## 📁 Project Structure

```
rich-answer-ai/
├── public/
│   ├── index.html       # Clean modern interface & page inspector modal
│   ├── style.css        # Responsive styling & themes
│   └── script.js        # Client-side RAG interaction & visual page viewer
├── uploads/             # Staged manuals (ignored by git)
├── server.js            # Express server, PDF extraction, OCR, & page rendering
├── test-e2e.js          # Automated end-to-end test suite
├── package.json         # Dependencies & scripts
└── .env.example         # Environment template
```
