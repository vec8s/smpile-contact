/**
 * Simple Contact — Client Application Logic (JavaScript)
 * -----------------------------------------------------
 * هذا الملف مسؤول عن إدارة اتصال الـ WebSocket من طرف المتصفح:
 * 1. فتح اتصال WebSocket مع السيرفر.
 * 2. إرسال اسم المستخدم (Join).
 * 3. استقبال قائمة المتصلين وتحديث القائمة الجانبية.
 * 4. إرسال واستقبال الرسائل وعرضها في صندوق المحادثة.
 * 5. التعامل مع قطع الاتصال (Disconnect).
 */

// حالة التطبيق في المتصفح (State)
let socket = null;
let currentUsername = "";
let selectedRecipient = null;

// عناصر الواجهة (DOM Elements)
const joinSection = document.getElementById("join-section");
const chatSection = document.getElementById("chat-section");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const joinError = document.getElementById("join-error");

const connectionStatus = document.getElementById("connection-status");
const statusText = document.getElementById("status-text");
const currentUserDisplay = document.getElementById("current-user-display");
const disconnectBtn = document.getElementById("disconnect-btn");

const usersList = document.getElementById("users-list");
const usersCount = document.getElementById("users-count");
const targetUserDisplay = document.getElementById("target-user-display");

const messagesBox = document.getElementById("messages-box");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");


/**
 * 1. بدء الاتصال والانضمام للمحادثة (Join)
 */
joinBtn.addEventListener("click", handleJoin);
usernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleJoin();
});

function handleJoin() {
    const name = usernameInput.value.trim();
    if (!name) {
        showError("يرجى إدخال اسم مستخدم صالح.");
        return;
    }

    hideError();
    currentUsername = name;

    // الاتصال بسيرفر الـ WebSocket على منفذ 8765 باستخدام نفس عنوان الـ IP المفتوح به المتصفح
    const host = window.location.hostname || "localhost";
    const wsUrl = `ws://${host}:8765`;

    updateStatus(false, "جاري الاتصال...");

    try {
        socket = new WebSocket(wsUrl);
    } catch (err) {
        showError("تعذر إنشاء اتصال WebSocket بالسيرفر.");
        updateStatus(false, "فشل الاتصال");
        return;
    }

    // عند نجاح فتح اتصال WebSocket
    socket.onopen = () => {
        // إرسال رسالة الانضمام بالاسم المحدد
        socket.send(JSON.stringify({
            type: "join",
            username: currentUsername
        }));
    };

    // عند استقبال أي رسالة من السيرفر
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleIncomingMessage(data);
        } catch (e) {
            console.error("خطأ في قراءة بيانات السيرفر:", e);
        }
    };

    // عند إغلاق الاتصال
    socket.onclose = () => {
        updateStatus(false, "غير متصل");
        resetToLogin("تم قطع الاتصال بالسيرفر.");
    };

    // عند حدوث خطأ في الاتصال
    socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        showError("حدث خطأ في الاتصال بالسيرفر.");
    };
}


/**
 * 2. معالجة الرسائل القادمة من السيرفر (Message Routing)
 */
function handleIncomingMessage(data) {
    switch (data.type) {
        case "join_success":
            // تأكيد نجاح الانضمام
            updateStatus(true, "متصل");
            joinSection.classList.add("hidden");
            chatSection.classList.remove("hidden");
            currentUserDisplay.textContent = currentUsername;
            appendSystemMessage(`مرحباً بك يا ${currentUsername}! أنت متصل الآن.`);
            break;

        case "users":
            // تحديث قائمة المتصلين
            renderUsersList(data.users || []);
            break;

        case "message":
            // رسالة واردة من مستخدم آخر
            appendMessage(data.from, data.text, "received");
            break;

        case "message_sent":
            // تأكيد إرسال رسالتك
            appendMessage("أنت", data.text, "sent");
            break;

        case "error":
            showError(data.message);
            appendSystemMessage(`تنبيه: ${data.message}`);
            break;
    }
}


/**
 * 3. تحديث قائمة المستخدمين المتصلين في القائمة الجانبية
 */
function renderUsersList(users) {
    usersList.innerHTML = "";
    usersCount.textContent = users.length;

    let targetStillOnline = false;

    users.forEach((user) => {
        const li = document.createElement("li");
        li.className = "user-item";

        const dot = document.createElement("span");
        dot.className = "user-status-dot";
        li.appendChild(dot);

        const nameSpan = document.createElement("span");

        if (user === currentUsername) {
            li.classList.add("self");
            nameSpan.textContent = `${user} (أنت)`;
        } else {
            nameSpan.textContent = user;
            if (user === selectedRecipient) {
                li.classList.add("active");
                targetStillOnline = true;
            }

            // عند النقر على مستخدم لاختياره للمحادثة
            li.addEventListener("click", () => selectRecipient(user));
        }

        li.appendChild(nameSpan);
        usersList.appendChild(li);
    });

    // إذا خرج المستخدم الذي كنا نحدثه
    if (selectedRecipient && !targetStillOnline) {
        appendSystemMessage(`المستخدم ${selectedRecipient} غادر المحادثة.`);
        selectRecipient(null);
    }
}


/**
 * 4. اختيار مستخدم لبدء المحادثة معه
 */
function selectRecipient(username) {
    selectedRecipient = username;

    if (username) {
        targetUserDisplay.textContent = username;
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.placeholder = `اكتب رسالة إلى ${username}...`;
        messageInput.focus();
    } else {
        targetUserDisplay.textContent = "اختر مستخدماً من القائمة";
        messageInput.disabled = true;
        sendBtn.disabled = true;
        messageInput.placeholder = "اكتب رسالتك هنا...";
    }

    // تحديث التحديد في الواجهة
    const items = usersList.querySelectorAll(".user-item");
    items.forEach((item) => {
        const name = item.textContent.replace(" (أنت)", "").trim();
        if (name === username) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
}


/**
 * 5. إرسال رسالة إلى المستخدم المختار
 */
messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();

    if (!text || !selectedRecipient || !socket) return;

    // إرسال الرسالة بتنسيق JSON إلى السيرفر
    socket.send(JSON.stringify({
        type: "message",
        to: selectedRecipient,
        text: text
    }));

    messageInput.value = "";
    messageInput.focus();
});


/**
 * 6. زر قطع الاتصال (Disconnect)
 */
disconnectBtn.addEventListener("click", () => {
    if (socket) {
        // إرسال إشعار بالمغادرة للسيرفر
        try {
            socket.send(JSON.stringify({ type: "leave" }));
        } catch (e) {}
        socket.close();
    }
    resetToLogin("تم قطع الاتصال بنجاح.");
});


/**
 * دالات مساعدة لعرض الرسائل وحالة الاتصال
 */
function appendMessage(sender, text, type) {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${type}`;

    const senderHeader = document.createElement("div");
    senderHeader.className = "msg-sender";
    senderHeader.textContent = sender;

    const content = document.createElement("div");
    content.className = "msg-text";
    content.textContent = text;

    const time = document.createElement("div");
    time.className = "msg-time";
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.appendChild(senderHeader);
    bubble.appendChild(content);
    bubble.appendChild(time);

    messagesBox.appendChild(bubble);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

function appendSystemMessage(text) {
    const sysMsg = document.createElement("div");
    sysMsg.className = "system-message";
    sysMsg.textContent = text;
    messagesBox.appendChild(sysMsg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

function updateStatus(isConnected, text) {
    statusText.textContent = text;
    if (isConnected) {
        connectionStatus.className = "status-badge connected";
    } else {
        connectionStatus.className = "status-badge disconnected";
    }
}

function showError(msg) {
    joinError.textContent = msg;
    joinError.classList.remove("hidden");
}

function hideError() {
    joinError.textContent = "";
    joinError.classList.add("hidden");
}

function resetToLogin(message) {
    currentUsername = "";
    selectedRecipient = null;
    chatSection.classList.add("hidden");
    joinSection.classList.remove("hidden");
    messagesBox.innerHTML = '<div class="system-message info">اختر أحد المتصلين من القائمة لبدء المحادثة معه.</div>';
    selectRecipient(null);
    if (message) showError(message);
}
