const pdfFile = document.getElementById("pdfFile");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");

const questionInput = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");

const messages = document.getElementById("messages");


// ==========================================
// CHECK ELEMENTS
// ==========================================

console.log("================================");
console.log("🚀 Rich Answer AI");
console.log("================================");

console.log("PDF Input:", pdfFile);
console.log("Upload Button:", uploadBtn);
console.log("Upload Status:", uploadStatus);
console.log("Question Input:", questionInput);
console.log("Send Button:", sendBtn);
console.log("Messages:", messages);


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

    try {

        console.log(
            "📡 Sending PDF to /api/upload..."
        );


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
    }

});


// ==========================================
// SEND QUESTION
// ==========================================

sendBtn.addEventListener(
    "click",
    askQuestion
);


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

        return;
    }


    // --------------------------------------
    // DISPLAY USER QUESTION
    // --------------------------------------

    addUserMessage(
        question
    );


    // --------------------------------------
    // CLEAR INPUT
    // --------------------------------------

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


    try {

        console.log(
            "💬 Asking:",
            question
        );


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


        } else {

            // --------------------------------
            // ERROR RESPONSE
            // --------------------------------

            addBotMessage(
                "❌ " +
                (
                    data.message ||
                    "Failed to generate answer."
                )
            );
        }


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
    }

}


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

    try {

        const response =
            await fetch(
                "/api/test"
            );


        const data =
            await response.json();


        if (data.success) {

            console.log(
                "✅ Server connection successful."
            );

        } else {

            console.warn(
                "⚠️ Server responded but test failed."
            );
        }


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