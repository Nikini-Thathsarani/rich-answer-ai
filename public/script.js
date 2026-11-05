<<<<<<< Updated upstream
=======
// ============================================================
// RICH ANSWER AI - CLIENT INTERACTION LOGIC
// ============================================================

// DOM Elements
>>>>>>> Stashed changes
const pdfFile = document.getElementById("pdfFile");
const dropZone = document.getElementById("dropZone");
const selectedFileInfo = document.getElementById("selectedFileInfo");
const selectedFileName = document.getElementById("selectedFileName");
const selectedFileSize = document.getElementById("selectedFileSize");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");

const uploadCard = document.getElementById("uploadCard");
const manualCard = document.getElementById("manualCard");
const activeDocName = document.getElementById("activeDocName");
const activeDocPages = document.getElementById("activeDocPages");
const activeDocChunks = document.getElementById("activeDocChunks");
const activeDocMethod = document.getElementById("activeDocMethod");
const resetManualBtn = document.getElementById("resetManualBtn");
const browsePagesBtn = document.getElementById("browsePagesBtn");
const suggestionsCard = document.getElementById("suggestionsCard");

const questionInput = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const clearChatBtn = document.getElementById("clearChatBtn");
const chatSubtitle = document.getElementById("chatSubtitle");
const aiModeBadge = document.getElementById("aiModeBadge");
const aiModeText = document.getElementById("aiModeText");

// Modal Elements
const pageModal = document.getElementById("pageModal");
const modalPageTitle = document.getElementById("modalPageTitle");
const modalPageImage = document.getElementById("modalPageImage");
const modalPageText = document.getElementById("modalPageText");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalPrevPage = document.getElementById("modalPrevPage");
const modalNextPage = document.getElementById("modalNextPage");
const modalPageJump = document.getElementById("modalPageJump");
const modalTotalPages = document.getElementById("modalTotalPages");
const imageLoadingSpinner = document.getElementById("imageLoadingSpinner");

const tabImageBtn = document.getElementById("tabImageBtn");
const tabTextBtn = document.getElementById("tabTextBtn");
const modalImageView = document.getElementById("modalImageView");
const modalTextView = document.getElementById("modalTextView");

const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomLevelText = document.getElementById("zoomLevelText");

// App State
let activeFile = null;
let currentManualPages = 0;
let currentModalPage = 1;
let currentZoom = 1.0;

async function readApiResponse(response, endpoint) {
    const body = await response.text();
    const setupHint = 'Start the app with "npm start", open http://localhost:3000, and check the server terminal for errors.';

<<<<<<< Updated upstream
// ==========================================
// UPLOAD PDF
// ==========================================

uploadBtn.addEventListener("click", async () => {

    const file = pdfFile.files[0];

    // --------------------------------------
    // CHECK FILE
    // --------------------------------------

    if (!file) {

        uploadStatus.innerHTML =
            "❌ Please select a PDF file.";

        return;
    }


    // --------------------------------------
    // CHECK FILE TYPE
    // --------------------------------------

    if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    ) {

        uploadStatus.innerHTML =
            "❌ Only PDF files are allowed.";

        return;
    }


    // --------------------------------------
    // CHECK FILE SIZE
    // --------------------------------------

    const fileSizeMB =
        file.size / (1024 * 1024);

    console.log("================================");
    console.log("📤 UPLOAD STARTED");
    console.log("================================");

    console.log("📄 File:", file.name);
    console.log(
        "📦 Size:",
        fileSizeMB.toFixed(2),
        "MB"
    );
    console.log("📑 Type:", file.type);


    // Backend currently allows 20MB

    if (fileSizeMB > 20) {

        uploadStatus.innerHTML =
            "❌ PDF is too large.<br>" +
            "Maximum file size is 20 MB.";

        return;
    }


    // --------------------------------------
    // SHOW LOADING
    // --------------------------------------

    uploadStatus.innerHTML =
        "⏳ <strong>Uploading PDF...</strong><br>" +
        "Please wait while the manual is being processed.";


    // --------------------------------------
    // CREATE FORM DATA
    // --------------------------------------

    const formData =
        new FormData();

    // IMPORTANT:
    // Must be "pdf" because backend uses:
    // upload.single("pdf")

    formData.append(
        "pdf",
        file
    );


    // --------------------------------------
    // SEND PDF TO SERVER
    // --------------------------------------

=======
    if (!body.trim()) {
        throw new Error(`${endpoint} returned an empty response (HTTP ${response.status}). ${setupHint}`);
    }

    let data;
>>>>>>> Stashed changes
    try {
        data = JSON.parse(body);
    } catch {
        const contentType = response.headers.get("content-type") || "unknown content type";
        throw new Error(`${endpoint} returned invalid JSON (HTTP ${response.status}, ${contentType}). ${setupHint}`);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error(`${endpoint} returned an unexpected response. ${setupHint}`);
    }

    return data;
}

<<<<<<< Updated upstream
        const response =
            await fetch(
                "/api/upload",
                {
                    method: "POST",

                    // DO NOT add Content-Type here.
                    // Browser automatically creates:
                    // multipart/form-data boundary

                    body: formData
                }
            );


        // ----------------------------------
        // RESPONSE STATUS
        // ----------------------------------

        console.log(
            "📡 HTTP Status:",
            response.status
        );

        console.log(
            "📡 Status Text:",
            response.statusText
        );


        // ----------------------------------
        // READ RESPONSE
        // ----------------------------------

        const responseText =
            await response.text();


        console.log(
            "📨 SERVER RAW RESPONSE:"
        );

        console.log(
            responseText
        );


        // ----------------------------------
        // CONVERT RESPONSE TO JSON
        // ----------------------------------

        let data;

        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (jsonError) {

            console.error(
                "❌ JSON PARSE ERROR:",
                jsonError
            );

            uploadStatus.innerHTML =
                "❌ Server returned an invalid response.<br>" +
                `HTTP Status: ${response.status}`;

            return;
        }


        // ----------------------------------
        // DISPLAY SERVER RESPONSE
        // ----------------------------------

        console.log(
            "📨 PARSED SERVER RESPONSE:"
        );

        console.log(
            data
        );


        // ----------------------------------
        // CHECK HTTP ERROR
        // ----------------------------------

        if (!response.ok) {

            console.error(
                "❌ Server Error:",
                data
            );


            uploadStatus.innerHTML =
                `
                ❌ <strong>Upload Failed</strong><br>
                HTTP Status: ${response.status}<br>
                ${
                    data.message ||
                    "Unknown server error."
                }
                `;

            return;
        }


        // ----------------------------------
        // CHECK SUCCESS
        // ----------------------------------

        if (data.success) {

            console.log(
                "================================"
            );

            console.log(
                "✅ PDF UPLOAD SUCCESSFUL"
            );

            console.log(
                "================================"
            );


            // --------------------------------
            // UPLOAD INFORMATION
            // --------------------------------

            uploadStatus.innerHTML =
                `
                ✅ <strong>PDF Uploaded Successfully!</strong>
                <br><br>

                📄 <strong>File:</strong>
                ${escapeHTML(
                    data.fileName ||
                    file.name
                )}

                <br>

                📖 <strong>Total Pages:</strong>
                ${data.totalPages || "N/A"}

                <br>

                📚 <strong>Processed Pages:</strong>
                ${data.processedPages || "N/A"}

                <br>

                📝 <strong>Text Length:</strong>
                ${data.textLength || 0}
                characters

                <br>

                🧩 <strong>Chunks:</strong>
                ${data.chunks || 0}

                <br><br>

                ${
                    data.ocrUsed
                        ? "👁️ <strong>OCR was used</strong> because the PDF contained little/no selectable text."
                        : "📄 <strong>Normal PDF text extraction was used.</strong>"
                }
                `;


            // --------------------------------
            // CHAT MESSAGE
            // --------------------------------

            addBotMessage(
                `
                ✅ <strong>Technical manual loaded successfully!</strong>
                <br><br>

                📄 ${escapeHTML(
                    data.fileName ||
                    file.name
                )}

                <br>

                📖 Processed
                ${data.processedPages || 0}
                pages.

                <br>

                📚 Created
                ${data.chunks || 0}
                searchable chunks.

                <br><br>

                💬 You can now ask questions about the manual.
                `
            );


        } else {

            // --------------------------------
            // SERVER RETURNED success:false
            // --------------------------------

            uploadStatus.innerHTML =
                `
                ❌ <strong>Upload Failed</strong>
                <br>
                ${
                    data.message ||
                    "Failed to process PDF."
                }
                `;
        }


    } catch (error) {

        // ----------------------------------
        // NETWORK ERROR
        // ----------------------------------

        console.error(
            "🔥 FETCH ERROR:"
        );

        console.error(
            error
        );


        uploadStatus.innerHTML =
            `
            ❌ <strong>Network Error</strong>
            <br>
            ${escapeHTML(
                error.message
            )}
            <br><br>
            Please make sure the server is running.
            `;
=======
// ============================================================
// INITIALIZATION & SERVER STATUS
// ============================================================

async function checkServerStatus() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error("Server offline");
        const data = await readApiResponse(res, "/api/status");

        // Update AI badge
        aiModeBadge.className = "status-badge " + (data.hasOpenAIKey ? "status-live" : "status-demo");
        aiModeText.textContent = data.hasOpenAIKey ? "OpenAI Live (GPT-4)" : "Local Semantic RAG (Demo)";

        // Restore manual if already indexed
        if (data.uploaded) {
            currentManualPages = data.totalPages;
            showManualLoadedState({
                fileName: data.fileName,
                totalPages: data.totalPages,
                chunks: data.chunks,
                ocrUsed: data.ocrUsed
            });
        }
    } catch (err) {
        console.warn("Server connection check failed:", err);
        aiModeBadge.className = "status-badge status-loading";
        aiModeText.textContent = "Server Disconnected";
>>>>>>> Stashed changes
    }
}

// ============================================================
// DRAG & DROP & FILE SELECTION
// ============================================================

dropZone.addEventListener("click", () => pdfFile.click());

["dragenter", "dragover"].forEach(evt => {
    dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("drag-over");
    });
});

["dragleave", "drop"].forEach(evt => {
    dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("drag-over");
    });
});

dropZone.addEventListener("drop", e => {
    const files = e.dataTransfer.files;
    if (files.length) handleFileSelected(files[0]);
});

pdfFile.addEventListener("change", e => {
    if (e.target.files.length) handleFileSelected(e.target.files[0]);
});

function handleFileSelected(file) {
    if (!file) return;

<<<<<<< Updated upstream
// ==========================================
// ENTER KEY
// ==========================================

questionInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            askQuestion();
        }

    }
);


// ==========================================
// ASK QUESTION FUNCTION
// ==========================================

async function askQuestion() {

    const question =
        questionInput.value.trim();


    // --------------------------------------
    // CHECK QUESTION
    // --------------------------------------

    if (!question) {

=======
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showUploadStatus("❌ Only PDF files are supported.", "status-error");
>>>>>>> Stashed changes
        return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (sizeMB > 30) {
        showUploadStatus("❌ File is too large. Maximum size is 30 MB.", "status-error");
        return;
    }

<<<<<<< Updated upstream
    // --------------------------------------
    // DISPLAY USER QUESTION
    // --------------------------------------
=======
    activeFile = file;
    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = `${sizeMB} MB`;
    selectedFileInfo.classList.remove("hidden");
    uploadStatus.classList.add("hidden");
}
>>>>>>> Stashed changes

function showUploadStatus(msg, className) {
    uploadStatus.className = `upload-status ${className}`;
    uploadStatus.innerHTML = msg;
    uploadStatus.classList.remove("hidden");
}

// ============================================================
// UPLOAD PDF MANUAL
// ============================================================

uploadBtn.addEventListener("click", async () => {
    if (!activeFile) return;

<<<<<<< Updated upstream
    questionInput.value = "";


    // --------------------------------------
    // DISABLE SEND BUTTON
    // --------------------------------------

    sendBtn.disabled = true;


    // --------------------------------------
    // LOADING MESSAGE
    // --------------------------------------

    const loading =
        addBotMessage(
            "⏳ Thinking..."
        );
=======
    uploadBtn.disabled = true;
    showUploadStatus("⏳ <strong>Processing Manual...</strong><br>Extracting pages, OCR & generating RAG embeddings...", "status-info");
>>>>>>> Stashed changes

    const formData = new FormData();
    formData.append("pdf", activeFile);

    try {
        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

<<<<<<< Updated upstream
        console.log(
            "💬 Asking:",
            question
        );
=======
        const data = await readApiResponse(response, "/api/upload");
>>>>>>> Stashed changes

        if (response.ok && data.success) {
            showUploadStatus("✅ Manual indexed successfully!", "status-success");
            currentManualPages = data.totalPages;

<<<<<<< Updated upstream
        // ----------------------------------
        // SEND QUESTION
        // ----------------------------------

        const response =
            await fetch(
                "/api/ask",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            question:
                                question
                        })
                }
            );


        console.log(
            "📡 Ask status:",
            response.status
        );


        // ----------------------------------
        // READ RESPONSE
        // ----------------------------------

        const responseText =
            await response.text();


        console.log(
            "📨 Ask response:",
            responseText
        );


        let data;

        try {

            data =
                JSON.parse(
                    responseText
                );

        } catch (error) {

            loading.remove();

            addBotMessage(
                "❌ Server returned an invalid response."
            );

            console.error(
                "JSON error:",
                error
            );

            return;
        }


        // ----------------------------------
        // REMOVE LOADING
        // ----------------------------------

        loading.remove();


        // ----------------------------------
        // CHECK SUCCESS
        // ----------------------------------

        if (
            response.ok &&
            data.success
        ) {

            // --------------------------------
            // FORMAT ANSWER
            // --------------------------------

            const formattedAnswer =
                formatAnswer(
                    data.answer ||
                    "No answer received."
                );


            // --------------------------------
            // SOURCE PAGES
            // --------------------------------

            let sourceText = "";


            if (
                data.sourcePages &&
                data.sourcePages.length > 0
            ) {

                sourceText =
                    `
                    <div class="sources">
                        📖 <strong>Source Pages:</strong>
                        ${data.sourcePages
                            .map(
                                page =>
                                    `Page ${page}`
                            )
                            .join(", ")}
                    </div>
                    `;
            }


            // --------------------------------
            // TESTING MODE
            // --------------------------------

            let testingText = "";


            if (
                data.testingMode
            ) {

                testingText =
                    `
                    <div class="sources">
                        🧪 <strong>Testing Mode:</strong>
                        OpenAI credits are currently unavailable.
                    </div>
                    `;
            }


            // --------------------------------
            // DISPLAY ANSWER
            // --------------------------------

            addBotMessage(
                formattedAnswer +
                sourceText +
                testingText
            );

=======
            showManualLoadedState(data);
>>>>>>> Stashed changes

            addBotMessage(`
                <h3>✅ Technical Manual Loaded!</h3>
                <p><strong>${escapeHTML(data.fileName)}</strong> has been indexed.</p>
                <ul>
                    <li><strong>Pages Processed:</strong> ${data.processedPages} / ${data.totalPages}</li>
                    <li><strong>Searchable Chunks:</strong> ${data.chunks}</li>
                    <li><strong>Extraction Mode:</strong> ${data.ocrUsed ? "👁️ Tesseract OCR" : "📄 PDF.js Text"}</li>
                </ul>
                <p>You can now ask questions about specifications, wiring, procedures, or components.</p>
            `);
        } else {
            showUploadStatus(`❌ ${data.message || "Failed to process PDF."}`, "status-error");
        }
<<<<<<< Updated upstream


    } catch (error) {

        console.error(
            "🔥 Ask error:",
            error
        );


        loading.remove();


        addBotMessage(
            "❌ Could not connect to the server."
        );


    } finally {

        // ----------------------------------
        // ENABLE SEND BUTTON
        // ----------------------------------

        sendBtn.disabled = false;

        questionInput.focus();
=======
    } catch (err) {
        console.error("Upload error:", err);
        showUploadStatus(`❌ Upload failed: ${escapeHTML(err.message)}`, "status-error");
    } finally {
        uploadBtn.disabled = false;
>>>>>>> Stashed changes
    }
});

function showManualLoadedState(data) {
    activeDocName.textContent = data.fileName;
    activeDocPages.textContent = data.totalPages;
    activeDocChunks.textContent = data.chunks;
    activeDocMethod.textContent = data.ocrUsed ? "Tesseract OCR" : "PDF.js Native";

    manualCard.classList.remove("hidden");
    suggestionsCard.classList.remove("hidden");

    questionInput.disabled = false;
    sendBtn.disabled = false;
    chatSubtitle.textContent = `Querying: ${data.fileName}`;
    questionInput.placeholder = `Ask anything about ${data.fileName}...`;
    questionInput.focus();
}

// ============================================================
// RESET & CLEAR
// ============================================================

<<<<<<< Updated upstream
// ==========================================
// ADD USER MESSAGE
// ==========================================

function addUserMessage(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.className =
        "user-message";


    div.textContent =
        text;


    messages.appendChild(
        div
    );


    scrollMessages();

}


// ==========================================
// ADD BOT MESSAGE
// ==========================================

function addBotMessage(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.className =
        "bot-message";


    div.innerHTML =
        text;


    messages.appendChild(
        div
    );


    scrollMessages();


    return div;

}


// ==========================================
// FORMAT AI ANSWER
// ==========================================

function formatAnswer(
    answer
) {

    if (!answer) {

        return "No answer available.";
    }


    return answer

        // Escape basic HTML first
        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        // Bold Markdown
        .replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        )

        // Numbered list
        .replace(
            /^(\d+)\.\s(.+)$/gm,
            "<strong>$1.</strong> $2"
        )

        // Bullet points
        .replace(
            /^[-•]\s(.+)$/gm,
            "• $1"
        )

        // New lines
        .replace(
            /\n/g,
            "<br>"
        );
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


// ==========================================
// SCROLL CHAT
// ==========================================

function scrollMessages() {

    messages.scrollTop =
        messages.scrollHeight;

}


// ==========================================
// INITIAL SERVER TEST
// ==========================================

async function checkServer() {
=======
resetManualBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to unload the current manual?")) return;
>>>>>>> Stashed changes

    try {
        await fetch("/api/reset", { method: "DELETE" });
        activeFile = null;
        pdfFile.value = "";
        selectedFileInfo.classList.add("hidden");
        uploadStatus.classList.add("hidden");
        manualCard.classList.add("hidden");
        suggestionsCard.classList.add("hidden");

        questionInput.disabled = true;
        sendBtn.disabled = true;
        chatSubtitle.textContent = "Upload a manual to begin querying";
        questionInput.placeholder = "Upload a manual to begin querying...";

        addBotMessage("🗑️ Manual cleared. Please upload a new PDF manual to continue.");
    } catch (err) {
        console.error("Reset error:", err);
    }
});

clearChatBtn.addEventListener("click", () => {
    messages.innerHTML = `
        <div class="message bot-message welcome-message">
            <div class="message-avatar">🤖</div>
            <div class="message-body">
                <div class="message-content">
                    <h3>Chat Cleared 🧹</h3>
                    <p>Ask any new question about the manual below.</p>
                </div>
            </div>
        </div>
    `;
});

// ============================================================
// SUGGESTED QUESTION CHIPS
// ============================================================

document.querySelectorAll(".chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const query = btn.getAttribute("data-query");
        if (query) {
            questionInput.value = query;
            askQuestion();
        }
    });
});

// ============================================================
// ASK QUESTION FUNCTION
// ============================================================

<<<<<<< Updated upstream
    } catch (error) {

        console.error(
            "❌ Server connection failed."
        );

        console.error(
            error
        );
    }

}


// ==========================================
// RUN SERVER TEST
// ==========================================

checkServer();
=======
sendBtn.addEventListener("click", askQuestion);

questionInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        askQuestion();
    }
});

async function askQuestion() {
    const question = questionInput.value.trim();
    if (!question) return;

    addUserMessage(question);
    questionInput.value = "";
    sendBtn.disabled = true;
    questionInput.disabled = true;

    // Show loading bot bubble
    const loadingBubble = addBotMessage(`
        <div style="display: flex; align-items: center; gap: 8px;">
            <div class="spinner" style="width: 16px; height: 16px; border-width: 2px; border-color: #94a3b8; border-top-color: #2563eb; margin: 0;"></div>
            <span>Searching manual and formulating rich answer...</span>
        </div>
    `);

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        const data = await readApiResponse(response, "/api/ask");
        loadingBubble.remove();

        if (response.ok && data.success) {
            const formattedHTML = renderMarkdown(data.answer);

            // Build Visual Source Badges
            let sourcesHTML = "";
            if (data.sourcePages && data.sourcePages.length > 0) {
                const pills = data.sourcePages.map(page => `
                    <button class="page-preview-pill" onclick="openPageModal(${page})">
                        <span class="pill-icon">📄</span>
                        <span>Page ${page} Preview</span>
                    </button>
                `).join("");

                sourcesHTML = `
                    <div class="visual-sources">
                        <div class="sources-heading">
                            <span>📖 Verified Source Pages & Schematics</span>
                        </div>
                        <div class="sources-cards">
                            ${pills}
                        </div>
                    </div>
                `;
            }

            addBotMessage(formattedHTML + sourcesHTML);
        } else {
            addBotMessage(`❌ ${escapeHTML(data.message || "Failed to generate answer.")}`);
        }
    } catch (err) {
        console.error("Ask error:", err);
        loadingBubble.remove();
        addBotMessage(`❌ Request failed: ${escapeHTML(err.message)}`);
    } finally {
        sendBtn.disabled = false;
        questionInput.disabled = false;
        questionInput.focus();
    }
}

// ============================================================
// CHAT RENDERING HELPERS
// ============================================================

function addUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message user-message";
    msg.innerHTML = `
        <div class="message-avatar">👤</div>
        <div class="message-body">
            <div class="message-content">${escapeHTML(text).replace(/\n/g, "<br>")}</div>
        </div>
    `;
    messages.appendChild(msg);
    scrollChat();
}

function addBotMessage(html) {
    const msg = document.createElement("div");
    msg.className = "message bot-message";
    msg.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-body">
            <div class="message-content">${html}</div>
        </div>
    `;
    messages.appendChild(msg);
    scrollChat();
    return msg;
}

function scrollChat() {
    messages.scrollTop = messages.scrollHeight;
}

function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderMarkdown(md) {
    if (!md) return "";

    let html = escapeHTML(md);

    // Code blocks
    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Blockquote
    html = html.replace(/^>\s?(.*$)/gim, '<blockquote>$1</blockquote>');
    // Bullet points
    html = html.replace(/^[-*•]\s(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    // Numbered lists
    html = html.replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>');
    // Line breaks
    html = html.replace(/\n\n/g, '<p></p>');
    html = html.replace(/\n/g, '<br>');

    return html;
}

// ============================================================
// RICH PAGE INSPECTOR MODAL
// ============================================================

browsePagesBtn.addEventListener("click", () => {
    if (currentManualPages > 0) {
        openPageModal(1);
    }
});

window.openPageModal = async function(pageNum) {
    if (!currentManualPages) return;
    currentModalPage = Math.max(1, Math.min(pageNum, currentManualPages));
    currentZoom = 1.0;
    updateZoomDisplay();

    modalTotalPages.textContent = currentManualPages;
    modalPageJump.max = currentManualPages;
    modalPageJump.value = currentModalPage;
    modalPageTitle.textContent = `Page ${currentModalPage} Schematics & Text`;

    pageModal.classList.remove("hidden");

    // Load Image
    loadModalImage(currentModalPage);
    // Load Text
    loadModalText(currentModalPage);
};

function loadModalImage(page) {
    imageLoadingSpinner.classList.remove("hidden");
    modalPageImage.style.display = "none";

    const img = new Image();
    img.onload = () => {
        modalPageImage.src = img.src;
        modalPageImage.style.display = "block";
        imageLoadingSpinner.classList.add("hidden");
    };
    img.onerror = () => {
        imageLoadingSpinner.classList.add("hidden");
        modalPageImage.alt = "Failed to render page image.";
    };
    img.src = `/api/page/${page}?scale=1.8&t=${Date.now()}`;
}

async function loadModalText(page) {
    modalPageText.textContent = "Loading extracted text...";
    try {
        const res = await fetch(`/api/page-text/${page}`);
        const data = await readApiResponse(res, `/api/page-text/${page}`);
        if (data.success && data.text) {
            modalPageText.textContent = data.text;
        } else {
            modalPageText.textContent = "No selectable text found on this page (image or schematic).";
        }
    } catch (err) {
        modalPageText.textContent = `Could not fetch text for this page: ${err.message}`;
    }
}

// Close Modal
modalCloseBtn.addEventListener("click", closeModal);
pageModal.addEventListener("click", e => {
    if (e.target === pageModal) closeModal();
});
document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !pageModal.classList.contains("hidden")) {
        closeModal();
    }
});

function closeModal() {
    pageModal.classList.add("hidden");
}

// Pagination Controls
modalPrevPage.addEventListener("click", () => {
    if (currentModalPage > 1) {
        window.openPageModal(currentModalPage - 1);
    }
});

modalNextPage.addEventListener("click", () => {
    if (currentModalPage < currentManualPages) {
        window.openPageModal(currentModalPage + 1);
    }
});

modalPageJump.addEventListener("change", e => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
        window.openPageModal(val);
    }
});

// Tab Switching
tabImageBtn.addEventListener("click", () => {
    tabImageBtn.classList.add("active");
    tabTextBtn.classList.remove("active");
    modalImageView.classList.add("active");
    modalTextView.classList.remove("active");
});

tabTextBtn.addEventListener("click", () => {
    tabTextBtn.classList.add("active");
    tabImageBtn.classList.remove("active");
    modalTextView.classList.add("active");
    modalImageView.classList.remove("active");
});

// Zoom Controls
zoomInBtn.addEventListener("click", () => {
    currentZoom = Math.min(currentZoom + 0.25, 3.0);
    applyZoom();
});

zoomOutBtn.addEventListener("click", () => {
    currentZoom = Math.max(currentZoom - 0.25, 0.5);
    applyZoom();
});

zoomResetBtn.addEventListener("click", () => {
    currentZoom = 1.0;
    applyZoom();
});

function applyZoom() {
    modalPageImage.style.transform = `scale(${currentZoom})`;
    updateZoomDisplay();
}

function updateZoomDisplay() {
    zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
}

// Check server status on page load
checkServerStatus();
>>>>>>> Stashed changes
