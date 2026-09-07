/**
 * Simple Contact — Client Application Logic
 * -----------------------------------------
 * المسؤول عن:
 * 1. الاتصال بـ WebSocket.
 * 2. تسجيل المستخدم.
 * 3. عرض المستخدمين المتصلين.
 * 4. إدارة المحادثات الخاصة.
 * 5. إدارة محادثة المجموعة.
 * 6. إرسال واستقبال الرسائل.
 * 7. قطع الاتصال.
 */


/* =====================================================
   حالة التطبيق
   ===================================================== */

let socket = null;

let currentUsername = "";

let selectedRecipient = null;

/*
 * نوع المحادثة الحالية:
 *
 * "private"  = محادثة خاصة
 * "group"    = المجموعة
 */
let currentChatType = null;


/*
 * تخزين الرسائل بشكل منفصل لكل محادثة.
 *
 * privateChats:
 * {
 *   "اويس": [ ...messages ],
 *   "علي":  [ ...messages ]
 * }
 */
const privateChats = {};


/*
 * تخزين رسائل المجموعة بشكل مستقل.
 */
const groupMessages = [];


/* =====================================================
   عناصر الواجهة
   ===================================================== */

const joinSection =
    document.getElementById("join-section");

const chatSection =
    document.getElementById("chat-section");

const usernameInput =
    document.getElementById("username-input");

const joinBtn =
    document.getElementById("join-btn");

const joinError =
    document.getElementById("join-error");


const connectionStatus =
    document.getElementById("connection-status");

const statusText =
    document.getElementById("status-text");

const currentUserDisplay =
    document.getElementById("current-user-display");

const disconnectBtn =
    document.getElementById("disconnect-btn");


const usersList =
    document.getElementById("users-list");

const usersCount =
    document.getElementById("users-count");

const targetUserDisplay =
    document.getElementById("target-user-display");


const messagesBox =
    document.getElementById("messages-box");

const messageForm =
    document.getElementById("message-form");

const messageInput =
    document.getElementById("message-input");

const sendBtn =
    document.getElementById("send-btn");


/*
 * زر المجموعة الذي أضفناه في index.html
 */
const groupChatItem =
    document.getElementById("group-chat-item");


/* =====================================================
   1. تسجيل الدخول
   ===================================================== */

joinBtn.addEventListener(
    "click",
    handleJoin
);


usernameInput.addEventListener(
    "keydown",
    (e) => {

        if (e.key === "Enter") {

            handleJoin();

        }

    }
);


function handleJoin() {

    const name =
        usernameInput.value.trim();


    if (!name) {

        showError(
            "يرجى إدخال اسم مستخدم صالح."
        );

        return;

    }


    hideError();


    currentUsername = name;


    /*
     * استخدام نفس IP الذي فتح منه المستخدم الموقع.
     *
     * مثال:
     * http://192.168.46.34:8000
     *
     * يصبح:
     * ws://192.168.46.34:8765
     */
    const host =
        window.location.hostname ||
        "localhost";


    const wsUrl =
        `ws://${host}:8765`;


    updateStatus(
        false,
        "جاري الاتصال..."
    );


    try {

        socket =
            new WebSocket(wsUrl);

    }

    catch (err) {

        showError(
            "تعذر إنشاء اتصال WebSocket بالسيرفر."
        );

        updateStatus(
            false,
            "فشل الاتصال"
        );

        return;

    }


    /* عند فتح الاتصال */

    socket.onopen = () => {

        socket.send(
            JSON.stringify({

                type: "join",

                username:
                    currentUsername

            })
        );

    };


    /* استقبال البيانات */

    socket.onmessage = (event) => {

        try {

            const data =
                JSON.parse(event.data);


            handleIncomingMessage(data);

        }

        catch (e) {

            console.error(
                "خطأ في قراءة بيانات السيرفر:",
                e
            );

        }

    };


    /* عند إغلاق الاتصال */

    socket.onclose = () => {

        updateStatus(
            false,
            "غير متصل"
        );


        resetToLogin(
            "تم قطع الاتصال بالسيرفر."
        );

    };


    /* عند حدوث خطأ */

    socket.onerror = (err) => {

        console.error(
            "WebSocket Error:",
            err
        );


        showError(
            "حدث خطأ في الاتصال بالسيرفر."
        );

    };

}


/* =====================================================
   2. استقبال رسائل السيرفر
   ===================================================== */

function handleIncomingMessage(data) {

    switch (data.type) {


        /* ---------------------------------------------
           نجاح تسجيل الدخول
           --------------------------------------------- */

        case "join_success":

            updateStatus(
                true,
                "متصل"
            );


            joinSection.classList.add(
                "hidden"
            );


            chatSection.classList.remove(
                "hidden"
            );


            currentUserDisplay.textContent =
                currentUsername;


            appendSystemMessage(
                `مرحباً بك يا ${currentUsername}! أنت متصل الآن.`
            );

            break;


        /* ---------------------------------------------
           تحديث قائمة المستخدمين
           --------------------------------------------- */

        case "users":

            renderUsersList(
                data.users || []
            );

            break;


        /* ---------------------------------------------
           رسالة خاصة واردة
           --------------------------------------------- */

        case "message":

            handlePrivateIncomingMessage(
                data
            );

            break;


        /* ---------------------------------------------
           تأكيد رسالة خاصة مرسلة
           --------------------------------------------- */

        case "message_sent":

            handlePrivateSentMessage(
                data
            );

            break;


        /* ---------------------------------------------
           رسالة مجموعة
           --------------------------------------------- */

        case "group_message":

            handleGroupMessage(
                data
            );

            break;


        /* ---------------------------------------------
           خطأ
           --------------------------------------------- */

        case "error":

            showError(
                data.message
            );


            appendSystemMessage(
                `تنبيه: ${data.message}`
            );

            break;

    }

}


/* =====================================================
   3. قائمة المستخدمين
   ===================================================== */

function renderUsersList(users) {

    usersList.innerHTML = "";


    /*
     * المجموعة لا تُحسب كمستخدم.
     */
    usersCount.textContent =
        users.length;


    let targetStillOnline = false;


    users.forEach(
        (user) => {

            const li =
                document.createElement("li");


            li.className =
                "user-item";


            const dot =
                document.createElement("span");


            dot.className =
                "user-status-dot";


            li.appendChild(dot);


            const nameSpan =
                document.createElement("span");


            if (user === currentUsername) {

                li.classList.add(
                    "self"
                );


                nameSpan.textContent =
                    `${user} (أنت)`;

            }

            else {

                nameSpan.textContent =
                    user;


                /*
                 * معرفة هل المستخدم الحالي
                 * هو المستخدم المحدد.
                 */
                if (
                    currentChatType === "private" &&
                    user === selectedRecipient
                ) {

                    li.classList.add(
                        "active"
                    );


                    targetStillOnline =
                        true;

                }


                /*
                 * عند الضغط على المستخدم
                 */
                li.addEventListener(
                    "click",
                    () => {

                        selectRecipient(user);

                    }
                );

            }


            li.appendChild(
                nameSpan
            );


            usersList.appendChild(
                li
            );

        }
    );


    /*
     * إذا خرج المستخدم الذي كنا نحادثه
     */
    if (
        selectedRecipient &&
        currentChatType === "private" &&
        !targetStillOnline
    ) {

        appendSystemMessage(
            `المستخدم ${selectedRecipient} غادر المحادثة.`
        );


        selectRecipient(null);

    }

}


/* =====================================================
   4. اختيار محادثة خاصة
   ===================================================== */

function selectRecipient(username) {

    /*
     * لا يوجد مستخدم
     */
    if (!username) {

        selectedRecipient =
            null;

        currentChatType =
            null;


        targetUserDisplay.textContent =
            "اختر مستخدماً من القائمة";


        messageInput.disabled =
            true;


        sendBtn.disabled =
            true;


        messageInput.placeholder =
            "اكتب رسالتك هنا...";


        messagesBox.innerHTML =
            `
            <div class="system-message info">
                اختر أحد المتصلين من القائمة لبدء المحادثة معه.
            </div>
            `;


        updateActiveUser();

        return;

    }


    /*
     * تحديد المستخدم
     */
    selectedRecipient =
        username;


    currentChatType =
        "private";


    targetUserDisplay.textContent =
        username;


    messageInput.disabled =
        false;


    sendBtn.disabled =
        false;


    messageInput.placeholder =
        `اكتب رسالة إلى ${username}...`;


    /*
     * إذا لم تكن هناك محادثة محفوظة
     * ننشئ واحدة.
     */
    if (
        !privateChats[username]
    ) {

        privateChats[username] =
            [];

    }


    /*
     * عرض رسائل هذا المستخدم فقط.
     */
    renderPrivateChat(
        username
    );


    updateActiveUser();


    messageInput.focus();

}


/* =====================================================
   5. اختيار المجموعة
   ===================================================== */

function selectGroupChat() {

    selectedRecipient =
        null;


    currentChatType =
        "group";


    targetUserDisplay.textContent =
        "👥 المجموعة";


    messageInput.disabled =
        false;


    sendBtn.disabled =
        false;


    messageInput.placeholder =
        "اكتب رسالة إلى المجموعة...";


    /*
     * عرض رسائل المجموعة فقط.
     */
    renderGroupChat();


    updateActiveUser();


    messageInput.focus();

}


/*
 * ربط زر المجموعة بالدالة.
 */
if (groupChatItem) {

    groupChatItem.addEventListener(
        "click",
        selectGroupChat
    );

}


/* =====================================================
   6. تحديث التحديد في القائمة
   ===================================================== */

function updateActiveUser() {

    /*
     * تحديث المستخدمين
     */
    const items =
        usersList.querySelectorAll(
            ".user-item"
        );


    items.forEach(
        (item) => {

            const name =
                item.textContent
                    .replace(
                        " (أنت)",
                        ""
                    )
                    .trim();


            if (
                currentChatType === "private" &&
                name === selectedRecipient
            ) {

                item.classList.add(
                    "active"
                );

            }

            else {

                item.classList.remove(
                    "active"
                );

            }

        }
    );


    /*
     * تحديث المجموعة
     */
    if (groupChatItem) {

        if (
            currentChatType === "group"
        ) {

            groupChatItem.classList.add(
                "active"
            );

        }

        else {

            groupChatItem.classList.remove(
                "active"
            );

        }

    }

}


/* =====================================================
   7. إرسال الرسائل
   ===================================================== */

messageForm.addEventListener(
    "submit",
    (e) => {

        e.preventDefault();


        const text =
            messageInput.value.trim();


        if (
            !text ||
            !socket
        ) {

            return;

        }


        /*
         * ==============================
         * Group Chat
         * ==============================
         */
        if (
            currentChatType === "group"
        ) {

            socket.send(
                JSON.stringify({

                    type:
                        "group_message",

                    text:
                        text

                })
            );


            messageInput.value =
                "";


            messageInput.focus();


            return;

        }


        /*
         * ==============================
         * Private Chat
         * ==============================
         */
        if (
            currentChatType === "private" &&
            selectedRecipient
        ) {

            socket.send(
                JSON.stringify({

                    type:
                        "message",

                    to:
                        selectedRecipient,

                    text:
                        text

                })
            );


            messageInput.value =
                "";


            messageInput.focus();

        }

    }
);


/* =====================================================
   8. استقبال رسالة خاصة
   ===================================================== */

function handlePrivateIncomingMessage(data) {

    const sender =
        data.from;


    /*
     * إنشاء محادثة إذا لم تكن موجودة.
     */
    if (
        !privateChats[sender]
    ) {

        privateChats[sender] =
            [];

    }


    /*
     * حفظ الرسالة.
     */
    privateChats[sender].push({

        sender:
            sender,

        text:
            data.text,

        type:
            "received"

    });


    /*
     * إذا كانت هذه المحادثة مفتوحة حاليًا
     * اعرض الرسالة فورًا.
     */
    if (
        currentChatType === "private" &&
        selectedRecipient === sender
    ) {

        renderPrivateChat(
            sender
        );

    }

}


/* =====================================================
   9. استقبال تأكيد الرسالة الخاصة
   ===================================================== */

function handlePrivateSentMessage(data) {

    const recipient =
        data.to;


    /*
     * إنشاء المحادثة إذا لم تكن موجودة.
     */
    if (
        !privateChats[recipient]
    ) {

        privateChats[recipient] =
            [];

    }


    /*
     * حفظ الرسالة.
     */
    privateChats[recipient].push({

        sender:
            "أنت",

        text:
            data.text,

        type:
            "sent"

    });


    /*
     * عرضها إذا كانت المحادثة مفتوحة.
     */
    if (
        currentChatType === "private" &&
        selectedRecipient === recipient
    ) {

        renderPrivateChat(
            recipient
        );

    }

}


/* =====================================================
   10. استقبال رسالة المجموعة
   ===================================================== */

function handleGroupMessage(data) {

    /*
     * حفظ رسالة المجموعة.
     */
    groupMessages.push({

        sender:
            data.from,

        text:
            data.text,

        type:
            data.from === currentUsername
                ? "sent"
                : "received"

    });


    /*
     * عرض الرسالة فقط إذا كانت المجموعة مفتوحة.
     */
    if (
        currentChatType === "group"
    ) {

        renderGroupChat();

    }

}


/* =====================================================
   11. عرض محادثة خاصة
   ===================================================== */

function renderPrivateChat(username) {

    messagesBox.innerHTML =
        "";


    const messages =
        privateChats[username] || [];


    if (
        messages.length === 0
    ) {

        appendSystemMessage(
            `لا توجد رسائل سابقة مع ${username}.`
        );


        return;

    }


    messages.forEach(
        (message) => {

            appendMessage(
                message.sender,
                message.text,
                message.type
            );

        }
    );

}


/* =====================================================
   12. عرض محادثة المجموعة
   ===================================================== */

function renderGroupChat() {

    messagesBox.innerHTML =
        "";


    if (
        groupMessages.length === 0
    ) {

        appendSystemMessage(
            "لا توجد رسائل في المجموعة حتى الآن."
        );


        return;

    }


    groupMessages.forEach(
        (message) => {

            appendMessage(
                message.sender,
                message.text,
                message.type
            );

        }
    );

}


/* =====================================================
   13. قطع الاتصال
   ===================================================== */

disconnectBtn.addEventListener(
    "click",
    () => {

        if (socket) {

            try {

                socket.send(
                    JSON.stringify({
                        type: "leave"
                    })
                );

            }

            catch (e) { }

            socket.close();

        }


        resetToLogin(
            "تم قطع الاتصال بنجاح."
        );

    }
);


/* =====================================================
   14. عرض الرسالة
   ===================================================== */

function appendMessage(
    sender,
    text,
    type
) {

    const bubble =
        document.createElement("div");


    bubble.className =
        `message-bubble ${type}`;


    const senderHeader =
        document.createElement("div");


    senderHeader.className =
        "msg-sender";


    senderHeader.textContent =
        sender;


    const content =
        document.createElement("div");


    content.className =
        "msg-text";


    content.textContent =
        text;


    const time =
        document.createElement("div");


    time.className =
        "msg-time";


    const now =
        new Date();


    time.textContent =
        now.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    bubble.appendChild(
        senderHeader
    );


    bubble.appendChild(
        content
    );


    bubble.appendChild(
        time
    );


    messagesBox.appendChild(
        bubble
    );


    messagesBox.scrollTop =
        messagesBox.scrollHeight;

}


/* =====================================================
   15. رسائل النظام
   ===================================================== */

function appendSystemMessage(text) {

    const sysMsg =
        document.createElement("div");


    sysMsg.className =
        "system-message";


    sysMsg.textContent =
        text;


    messagesBox.appendChild(
        sysMsg
    );


    messagesBox.scrollTop =
        messagesBox.scrollHeight;

}


/* =====================================================
   16. حالة الاتصال
   ===================================================== */

function updateStatus(
    isConnected,
    text
) {

    statusText.textContent =
        text;


    if (isConnected) {

        connectionStatus.className =
            "status-badge connected";

    }

    else {

        connectionStatus.className =
            "status-badge disconnected";

    }

}


/* =====================================================
   17. الأخطاء
   ===================================================== */

function showError(msg) {

    joinError.textContent =
        msg;


    joinError.classList.remove(
        "hidden"
    );

}


function hideError() {

    joinError.textContent =
        "";


    joinError.classList.add(
        "hidden"
    );

}


/* =====================================================
   18. إعادة التطبيق إلى شاشة الدخول
   ===================================================== */

function resetToLogin(message) {

    currentUsername =
        "";


    selectedRecipient =
        null;


    currentChatType =
        null;


    /*
     * تنظيف المحادثات عند تسجيل الخروج.
     */
    Object.keys(
        privateChats
    ).forEach(
        (key) => {

            delete privateChats[key];

        }
    );


    groupMessages.length =
        0;


    chatSection.classList.add(
        "hidden"
    );


    joinSection.classList.remove(
        "hidden"
    );


    messagesBox.innerHTML =
        `
        <div class="system-message info">
            اختر أحد المتصلين من القائمة لبدء المحادثة معه.
        </div>
        `;


    selectRecipient(
        null
    );


    if (message) {

        showError(
            message
        );

    }

}