// ========================================
// Simple Contact - WebSocket Frontend
// ========================================

// WebSocket connection
let socket = null;

// Current username
let currentUsername = "";

// Selected recipient
let selectedRecipient = null;


// ========================================
// DOM Elements
// ========================================

const joinSection = document.getElementById("join-section");
const chatSection = document.getElementById("chat-section");

const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const joinError = document.getElementById("join-error");

const connectionStatus = document.getElementById("connection-status");
const statusText = document.getElementById("status-text");
const currentUserDisplay = document.getElementById("current-user-display");

const disconnectBtn = document.getElementById("disconnect-btn");

const usersCount = document.getElementById("users-count");
const usersList = document.getElementById("users-list");

const targetUserDisplay = document.getElementById("target-user-display");
const messagesBox = document.getElementById("messages-box");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");


// ========================================
// Join
// ========================================

function handleJoin() {

    const name = usernameInput.value.trim();

    if (!name) {
        joinError.textContent = "يرجى إدخال اسم المستخدم.";
        usernameInput.focus();
        return;
    }

    joinError.textContent = "";

    currentUsername = name;

    // Use the current browser host
    const host = window.location.hostname || "localhost";
    const wsUrl = `ws://${host}:8765`;

    socket = new WebSocket(wsUrl);


    // ====================================
    // WebSocket Open
    // ====================================

    socket.onopen = () => {

        updateConnectionStatus(true);

        socket.send(
            JSON.stringify({
                type: "join",
                username: currentUsername
            })
        );
    };


    // ====================================
    // Receive Messages
    // ====================================

    socket.onmessage = (event) => {

        try {

            const data = JSON.parse(event.data);

            switch (data.type) {

                case "join_success":

                    handleJoinSuccess(data);
                    break;


                case "users":

                    renderUsers(data.users);
                    break;


                case "message":

                    displayMessage(
                        data.from,
                        data.text,
                        "received"
                    );

                    break;


                case "message_sent":

                    displayMessage(
                        "أنت",
                        data.text,
                        "sent"
                    );

                    break;


                case "error":

                    showError(data.message);
                    break;


                default:

                    console.log(
                        "Unknown server message:",
                        data
                    );
            }

        } catch (error) {

            console.error(
                "Invalid server response:",
                error
            );
        }
    };


    // ====================================
    // WebSocket Error
    // ====================================

    socket.onerror = () => {

        showError(
            "تعذر الاتصال بالسيرفر."
        );

        updateConnectionStatus(false);
    };


    // ====================================
    // WebSocket Close
    // ====================================

    socket.onclose = () => {

        updateConnectionStatus(false);

        joinSection.classList.remove("hidden");
        chatSection.classList.add("hidden");

        messageInput.disabled = true;
        sendBtn.disabled = true;

        selectedRecipient = null;

        console.log("WebSocket connection closed.");
    };
}


// ========================================
// Join Success
// ========================================

function handleJoinSuccess(data) {

    currentUsername = data.username;

    joinSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

    currentUserDisplay.textContent =
        `أنت متصل كـ: ${currentUsername}`;

    updateConnectionStatus(true);

    usernameInput.value = "";

    messageInput.disabled = true;
    sendBtn.disabled = true;
}


// ========================================
// Connection Status
// ========================================

function updateConnectionStatus(connected) {

    if (connected) {

        statusText.textContent = "متصل";

        connectionStatus.classList.add(
            "connected"
        );

    } else {

        statusText.textContent = "غير متصل";

        connectionStatus.classList.remove(
            "connected"
        );
    }
}


// ========================================
// Render Online Users
// ========================================

function renderUsers(users) {

    usersList.innerHTML = "";

    usersCount.textContent = users.length;


    if (users.length === 0) {

        const emptyItem =
            document.createElement("li");

        emptyItem.textContent =
            "لا يوجد مستخدمون متصلون.";

        usersList.appendChild(emptyItem);

        return;
    }


    users.forEach(username => {

        const userItem =
            document.createElement("li");

        userItem.className = "user-item";

        userItem.textContent =
            username === currentUsername
                ? `${username} (أنت)`
                : username;


        // Don't select yourself
        if (username === currentUsername) {

            userItem.classList.add(
                "current-user"
            );

            return;
        }


        userItem.addEventListener(
            "click",
            () => selectUser(username)
        );


        if (username === selectedRecipient) {

            userItem.classList.add(
                "selected"
            );
        }


        usersList.appendChild(userItem);

    });
}


// ========================================
// Select User
// ========================================

function selectUser(username) {

    selectedRecipient = username;

    targetUserDisplay.textContent =
        `المحادثة مع: ${username}`;

    messageInput.disabled = false;
    sendBtn.disabled = false;

    renderUsersFromCurrentList();

    messageInput.focus();
}


// ========================================
// Refresh Selected User Style
// ========================================

function renderUsersFromCurrentList() {

    const items =
        usersList.querySelectorAll(".user-item");

    items.forEach(item => {

        item.classList.remove("selected");

        const username =
            item.textContent.replace(" (أنت)", "");

        if (username === selectedRecipient) {

            item.classList.add("selected");
        }
    });
}


// ========================================
// Send Message
// ========================================

function sendMessage(text) {

    text = text.trim();

    if (!text) {

        messageInput.focus();

        return;
    }


    if (!selectedRecipient) {

        alert("اختر مستخدمًا أولًا.");

        return;
    }


    if (!socket ||
        socket.readyState !== WebSocket.OPEN) {

        alert("الاتصال بالسيرفر غير متاح.");

        return;
    }


    socket.send(
        JSON.stringify({
            type: "message",
            to: selectedRecipient,
            text: text
        })
    );


    messageInput.value = "";

    messageInput.focus();
}


// ========================================
// Display Message
// ========================================

function displayMessage(
    sender,
    text,
    type
) {

    // Remove empty message
    const emptyChat =
        messagesBox.querySelector(".empty-chat");

    if (emptyChat) {
        emptyChat.remove();
    }


    const messageBubble =
        document.createElement("div");

    messageBubble.className =
        `message-bubble ${type}`;


    const senderElement =
        document.createElement("div");

    senderElement.className = "message-sender";

    senderElement.textContent = sender;


    const textElement =
        document.createElement("div");

    textElement.className = "message-text";

    textElement.textContent = text;


    messageBubble.appendChild(
        senderElement
    );

    messageBubble.appendChild(
        textElement
    );


    messagesBox.appendChild(
        messageBubble
    );


    // Scroll to bottom
    messagesBox.scrollTop =
        messagesBox.scrollHeight;
}


// ========================================
// Show Error
// ========================================

function showError(message) {

    joinError.textContent = message;

    alert(message);
}


// ========================================
// Disconnect
// ========================================

function disconnect() {

    if (!socket) {
        return;
    }


    if (socket.readyState === WebSocket.OPEN) {

        socket.send(
            JSON.stringify({
                type: "leave"
            })
        );
    }


    socket.close();

    socket = null;

    selectedRecipient = null;
}


// ========================================
// Event Listeners
// ========================================

joinBtn.addEventListener(
    "click",
    handleJoin
);


usernameInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            handleJoin();
        }
    }
);


messageForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        sendMessage(messageInput.value);
    }
);


disconnectBtn.addEventListener(
    "click",
    disconnect
);