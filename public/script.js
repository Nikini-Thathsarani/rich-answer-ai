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


        const data = await response.json();


        if (data.success) {

            uploadStatus.innerHTML = `
                ✅ PDF uploaded successfully!
                <br>
                File: ${data.fileName}
                <br>
                Pages: ${data.pages}
                <br>
                Extracted characters: ${data.characters}
            `;

            addBotMessage(
                `📄 I have successfully read <b>${data.fileName}</b>.
                You can now ask questions about the technical manual.`
            );

        } else {

            uploadStatus.textContent =
                "❌ " + data.message;

        }

    } catch (error) {

        console.error(error);

        uploadStatus.textContent =
            "❌ Server error while uploading PDF.";

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