# دليل تكامل الواجهة الأمامية (Frontend Integration Guide)
## لربط `web/app.js` مع `server/websocket_server.py`

هذا الملف مخصص لمطور الواجهة الأمامية (Developer 2 / `feature/frontend`) لكتابة ملفات `web/` (`index.html`, `style.css`, `app.js`) بكل وضوح وتوافق تام 100% مع السيرفر.

---

## 1. بيانات الاتصال الشبكي (Network Endpoints)

| الخدمة | المنفذ (Port) | البروتوكول | الرابط في المتصفح / الكود |
| :--- | :---: | :---: | :--- |
| **HTTP Web Server** | `8000` | HTTP | `http://SERVER_IP:8000` |
| **WebSocket Server** | `8765` | WS | `ws://SERVER_IP:8765` |

### ⚠️ ملاحظة هامة جداً لعنوان WebSocket في JavaScript:
**لا تقم بكتابة `ws://localhost:8765` أو `ws://127.0.0.1:8765` بشكل ثابت (Hardcoded).**
بدلاً من ذلك، استخدم عنوان الـ Host الحالي للمتصفح حتى يعمل تلقائياً عند فتح الموقع من أجهزة الـ LAN الأخرى:

```javascript
// الطريقة الصحيحة لإنشاء رابط الـ WebSocket ديناميكياً:
const host = window.location.hostname || "localhost";
const wsUrl = `ws://${host}:8765`;
const socket = new WebSocket(wsUrl);
```

---

## 2. بروتوكول الرسائل المشترك (WebSocket JSON Protocol)

يتم التواصل بين المتصفح والسيرفر حصراً عبر نصوص **JSON**.

### أ. رسائل يرسلها المتصفح إلى السيرفر (Client ➔ Server)

#### 1. تسجيل اسم المستخدم (Join)
تُرسل عند ضغط المستخدم على زر الانضمام:
```json
{
  "type": "join",
  "username": "Ahmed"
}
```

#### 2. إرسال رسالة نصية لشخص محدد (Send Message)
تُرسل عند كتابة رسالة والضغط على إرسال:
```json
{
  "type": "message",
  "to": "Mohammed",
  "text": "السلام عليكم، كيف حالك؟"
}
```

#### 3. قطع الاتصال المتعمد (Leave / Disconnect)
تُرسل عند ضغط المستخدم على زر الخروج (اختياري قبل `socket.close()`):
```json
{
  "type": "leave"
}
```

---

### ب. رسائل يستقبلها المتصفح من السيرفر (Server ➔ Client)

يجب على `app.js` قراءة حقل `data.type` وتوجيه المعالجة بناءً عليه:

#### 1. تأكيد نجاح الانضمام (`join_success`)
يُرسلها السيرفر لتأكيد قبول الاسم:
```json
{
  "type": "join_success",
  "username": "Ahmed"
}
```
*الإجراء في الواجهة:* إخفاء نافذة تسجيل الدخول، إظهار شاشة المحادثة، وتغيير حالة الاتصال إلى "متصل".

---

#### 2. تحديث قائمة المتصلين (`users`)
يُرسلها السيرفر فور انضمام أو مغادرة أي مستخدم لجميع الأجهزة:
```json
{
  "type": "users",
  "users": ["Ahmed", "Mohammed", "Ali"]
}
```
*الإجراء في الواجهة:* مسح القائمة الجانبية وإعادة رسم أسماء المتصلين (`data.users`). 
*(ملاحظة: يمكنك تمييز اسم المستخدم الحالي بكلمة "أنت").*

---

#### 3. استلام رسالة واردة من مستخدم آخر (`message`)
يُرسلها السيرفر للطرف المستلم:
```json
{
  "type": "message",
  "from": "Ahmed",
  "to": "Mohammed",
  "text": "السلام عليكم، كيف حالك؟"
}
```
*الإجراء في الواجهة:* إضافة فقاعة رسالة واردة (Received Message Bubble) باسم المرسل ومحتوى الرسالة.

---

#### 4. تأكيد إرسال رسالتك بنجاح (`message_sent`)
يُرسلها السيرفر للمرسل نفسه لتأكيد وصولها للسيرفر:
```json
{
  "type": "message_sent",
  "from": "Ahmed",
  "to": "Mohammed",
  "text": "السلام عليكم، كيف حالك؟"
}
```
*الإجراء في الواجهة:* إضافة فقاعة رسالة مرسلة (Sent Message Bubble) في صندوق المحادثة.

---

#### 5. رسائل الخطأ والتنبيهات (`error`)
يُرسلها السيرفر عند وجود خطأ (اسم مكرر، اسم فارغ، مستخدم غير متصل):
```json
{
  "type": "error",
  "message": "الاسم 'Ahmed' مستخدم بالفعل، اختر اسماً آخر."
}
```
*الإجراء في الواجهة:* إظهار نص الخطأ في صندوق تنبيهات أحمر (`alert`).

---

## 3. المتغيرات الموصى بها في `web/app.js` (State Management)

```javascript
// 1. كائن اتصال الـ WebSocket
let socket = null;

// 2. اسم المستخدم الحالي بعد الانضمام
let currentUsername = "";

// 3. اسم المستخدم المختار حالياً للتحدث معه
let selectedRecipient = null;
```

---

## 4. المعرفات الموصى بها في `web/index.html` (DOM IDs)

لتسهيل كتابة الـ JavaScript والـ CSS، يُفضل استخدام هذه الـ IDs:

### أ. قسم تسجيل الدخول (`#join-section`):
- `id="username-input"`: حقل إدخال الاسم.
- `id="join-btn"`: زر الانضمام.
- `id="join-error"`: عنصر لعرض رسائل الخطأ (اسم مكرر / فارغ).

### ب. شريط العنوان وحالة الاتصال:
- `id="connection-status"`: شارة حالة الاتصال (متصل / غير متصل).
- `id="status-text"`: نص الحالة.
- `id="current-user-display"`: لعرض اسمك (`أنت متصل كـ: أحمد`).
- `id="disconnect-btn"`: زر قطع الاتصال.

### ج. القائمة الجانبية للمتصلين:
- `id="users-count"`: عدد المتصلين حالياً.
- `id="users-list"`: عنصر القائمة `<ul>` الذي تضاف داخله عناصر `<li>` لكل مستخدم.

### د. منطقة المحادثة والرسائل (`#chat-section`):
- `id="target-user-display"`: اسم الشخص المختار حالياً للتحدث معه (`المحادثة مع: محمد`).
- `id="messages-box"`: الحاوية التي تحتوي على فقاعات الرسائل (`div.message-bubble`).
- `id="message-form"`: النموذج (`<form>`).
- `id="message-input"`: حقل كتابة الرسالة.
- `id="send-btn"`: زر إرسال الرسالة.

---

## 5. الهيكل البرمجي المقترح لـ `web/app.js` (Code Skeleton)

```javascript
// 1. دالة بدء الاتصال والانضمام
function handleJoin() {
    const name = document.getElementById("username-input").value.trim();
    if (!name) return alert("يرجى إدخال اسم");

    currentUsername = name;
    const wsUrl = `ws://${window.location.hostname || "localhost"}:8765`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        // إرسال رسالة الانضمام فور فتح الاتصال
        socket.send(JSON.stringify({ type: "join", username: currentUsername }));
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case "join_success":
                // تفعيل واجهة الشات
                break;
            case "users":
                // تحديث قائمة المتصلين
                renderUsers(data.users);
                break;
            case "message":
                // عرض رسالة واردة من مستخدم آخر
                displayMessage(data.from, data.text, "received");
                break;
            case "message_sent":
                // عرض رسالتي المرسلة
                displayMessage("أنت", data.text, "sent");
                break;
            case "error":
                // إظهار الخطأ
                alert(data.message);
                break;
        }
    };

    socket.onclose = () => {
        // إعادة الواجهة لشاشة تسجيل الدخول
    };
}

// 2. دالة إرسال رسالة
function sendMessage(text) {
    if (!selectedRecipient || !socket) return;
    socket.send(JSON.stringify({
        type: "message",
        to: selectedRecipient,
        text: text
    }));
}

// 3. دالة قطع الاتصال
function disconnect() {
    if (socket) {
        socket.send(JSON.stringify({ type: "leave" }));
        socket.close();
    }
}
```

---

## 6. قائمة التحقق قبل تسليم الـ Frontend (Checklist)

- [ ] هل يتم فتح الـ WebSocket ديناميكياً باستخدام `window.location.hostname`؟
- [ ] هل يتم إرسال واستقبال النصوص بتنسيق JSON مطابق للأسماء المذكورة أعلاه؟
- [ ] هل يتم التحقق من أن حقل الاسم والرسالة غير فارغين قبل الإرسال؟
- [ ] هل يتم تفريغ حقل الرسالة بعد الضغط على إرسال والتركيز عليه (`focus()`)؟
- [ ] هل يتم التمرير التلقائي لأسفل صندوق الرسائل (`scrollTop = scrollHeight`) عند وصول رسالة جديدة؟
- [ ] هل الواجهة تدعم اللغة العربية واتجاه `dir="rtl"` بشكل مريح للعين؟
