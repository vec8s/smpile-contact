"""
WebSocket Server (سيرفر المحادثة اللحظية)
----------------------------------------
هذا الملف مسؤول عن:
1. استقبال اتصالات WebSocket من المتصفحات (Browsers).
2. معالجة رسائل JSON (تسجيل الاسم، إرسال واستقبال الرسائل، قطع الاتصال).
3. إرسال وتحديث قائمة المستخدمين المتصلين بشكل لحظي.
"""

import asyncio
import json
import websockets
from .connection_manager import ConnectionManager

# إنشاء نسخة عامة لإدارة اتصالات المستخدمين
manager = ConnectionManager()


async def broadcast_users():
    """إرسال قائمة المستخدمين المتصلين لجميع المستخدمين حالياً."""
    users = manager.get_online_users()
    payload = json.dumps({
        "type": "users",
        "users": users
    })
    
    # إرسال القائمة لكل المتصلين
    for username, socket in list(manager.active_connections.items()):
        try:
            await socket.send(payload)
        except Exception:
            pass


async def handle_connection(websocket):
    """
    الدالة الرئيسية لمعالجة اتصال كل عميل (Client).
    تستمر في العمل طالما أن اتصال الـ WebSocket مفتوح.
    """
    current_username = None

    try:
        async for raw_message in websocket:
            try:
                data = json.loads(raw_message)
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "تنسيق البيانات غير صالح (Invalid JSON)."
                }))
                continue

            msg_type = data.get("type")

            # 1. حالة الانضمام وتحديد الاسم (Join)
            if msg_type == "join":
                username = data.get("username", "").strip()

                if not username:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "اسم المستخدم لا يمكن أن يكون فارغاً."
                    }))
                    continue

                # محاولة تسجيل المستخدم
                if manager.add_user(username, websocket):
                    current_username = username
                    # إشعار المستخدم بنجاح الانضمام
                    await websocket.send(json.dumps({
                        "type": "join_success",
                        "username": username
                    }))
                    # تحديث قائمة المستخدمين لجميع المتصلين
                    await broadcast_users()
                    print(f"[+] انضم المستخدم: {username}")
                else:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": f"الاسم '{username}' مستخدم بالفعل، اختر اسماً آخر."
                    }))

            # 2. حالة إرسال رسالة نصية (Message)
            elif msg_type == "message":
                if not current_username:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "يجب تسجيل الدخول أولاً قبل إرسال الرسائل."
                    }))
                    continue

                recipient_name = data.get("to", "").strip()
                message_text = data.get("text", "").strip()

                if not recipient_name or not message_text:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "يجب تحديد المستقبل ومحتوى الرسالة."
                    }))
                    continue

                recipient_socket = manager.get_user_socket(recipient_name)

                if recipient_socket:
                    # إرسال الرسالة إلى المستقبل
                    incoming_payload = json.dumps({
                        "type": "message",
                        "from": current_username,
                        "to": recipient_name,
                        "text": message_text
                    })
                    await recipient_socket.send(incoming_payload)

                    # إرسال تأكيد للمرسل ليظهر في واجهته
                    sent_payload = json.dumps({
                        "type": "message_sent",
                        "from": current_username,
                        "to": recipient_name,
                        "text": message_text
                    })
                    await websocket.send(sent_payload)
                else:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": f"المستخدم '{recipient_name}' غير متصل حالياً."
                    }))

            # 3. حالة قطع الاتصال اليدوي (Leave)
            elif msg_type == "leave":
                break

    except websockets.exceptions.ConnectionClosed:
        # انقطاع الاتصال من طرف المتصفح
        pass
    finally:
        # تنظيف الاتصال عند الإغلاق سواء كان طبيعياً أو مفاجئاً
        removed_user = manager.remove_by_socket(websocket)
        if removed_user:
            print(f"[-] غادر المستخدم: {removed_user}")
            await broadcast_users()


async def start_websocket_server(host="0.0.0.0", port=8765):
    """تشغيل سيرفر الـ WebSocket."""
    server = await websockets.serve(handle_connection, host, port)
    print(f"[*] WebSocket Server يعمل على: ws://{host}:{port}")
    return server
