const pdfFile = document.getElementById("pdfFile");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");

const questionInput = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");

const messages = document.getElementById("messages");


/*
---------------------------------------
UPLOAD PDF
---------------------------------------
*/

uploadBtn.addEventListener("click", async () => {

    const file = pdfFile.files[0];

    if (!file) {
        uploadStatus.textContent =
            "❌ Please select a PDF file.";

        return;
    }

    if (file.type !== "application/pdf") {
        uploadStatus.textContent =
            "❌ Only PDF files are allowed.";

        return;
    }

    uploadStatus.textContent =
        "⏳ Uploading and reading PDF...";


    const formData = new FormData();

    formData.append("pdf", file);


    try {

        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server response error:", errorText);
            uploadStatus.textContent =
                `❌ Server error (${response.status}): ${response.statusText}`;
            return;
        }

        const data = await response.json();

        console.log("Upload response:", data);


        if (data.success) {

            uploadStatus.innerHTML = `
                ✅ <strong>PDF Uploaded Successfully!</strong><br>
                📄 File: ${data.fileName}<br>
                📖 Text Length: ${data.textLength} characters<br>
                📚 Chunks: ${data.chunks}<br>
                ${data.ocrUsed ? "👁️ OCR was used for scanned PDF" : ""}
            `;

            addBotMessage(
                "✅ <strong>Technical manual loaded successfully!</strong><br>" +
                `📖 Processed ${data.chunks} chunks.<br>` +
                "You can now ask questions about the manual."
            );

        } else {

            uploadStatus.textContent =
                "❌ " + (data.message || "Failed to upload PDF.") +
                (data.details ? `\n(${data.details})` : "");

        }

    } catch (error) {

        console.error("Fetch error:", error);

        uploadStatus.textContent =
            "❌ Network error: " + error.message;

    }

});


/*
---------------------------------------
SEND QUESTION
---------------------------------------
*/

sendBtn.addEventListener("click", askQuestion);


questionInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        askQuestion();
    }

});


async function askQuestion() {

    const question = questionInput.value.trim();


    if (!question) {
        return;
    }


    // Display user question

    addUserMessage(question);


    questionInput.value = "";


    // Loading message

    const loading = addBotMessage(
        "⏳ Thinking..."
    );


    try {

        const response = await fetch("/api/ask", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                question: question
            })

        });


        const data = await response.json();


        loading.remove();


        if (data.success) {

            addBotMessage(
                formatAnswer(data.answer)
            );

        } else {

            addBotMessage(
                "❌ " + data.message
            );

        }


    } catch (error) {

        console.error(error);

        loading.remove();

        addBotMessage(
            "❌ Could not connect to the server."
        );

    }

}


/*
---------------------------------------
ADD USER MESSAGE
---------------------------------------
*/

function addUserMessage(text) {

    const div = document.createElement("div");

    div.className = "user-message";

    div.textContent = text;

    messages.appendChild(div);

    scrollMessages();

}


/*
---------------------------------------
ADD BOT MESSAGE
---------------------------------------
*/

function addBotMessage(text) {

    const div = document.createElement("div");

    div.className = "bot-message";

    div.innerHTML = text;

    messages.appendChild(div);

    scrollMessages();

    return div;

}


/*
---------------------------------------
FORMAT AI ANSWER
---------------------------------------
*/

function formatAnswer(answer) {

    return answer
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

}


/*
---------------------------------------
SCROLL CHAT
---------------------------------------
*/

function scrollMessages() {

    messages.scrollTop = messages.scrollHeight;

}