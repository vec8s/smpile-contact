"""
WebSocket Server (سيرفر المحادثة اللحظية)
----------------------------------------
هذا الملف مسؤول عن:
1. استقبال اتصالات WebSocket من المتصفحات (Browsers).
2. معالجة رسائل JSON:
   - تسجيل الاسم
   - إرسال الرسائل الخاصة
   - إرسال رسائل المجموعة
   - قطع الاتصال
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
    for username, socket in list(
        manager.active_connections.items()
    ):
        try:
            await socket.send(payload)
        except Exception:
            pass


async def broadcast_group_message(sender, text):
    """
    إرسال رسالة المجموعة لجميع المستخدمين المتصلين.
    """

    payload = json.dumps({
        "type": "group_message",
        "from": sender,
        "text": text
    })

    # إرسال الرسالة لجميع المستخدمين
    for username, socket in list(
        manager.active_connections.items()
    ):
        try:
            await socket.send(payload)
        except Exception:
            pass


async def handle_connection(websocket):
    """
    الدالة الرئيسية لمعالجة اتصال كل Client.

    تستمر في العمل طالما أن اتصال WebSocket مفتوح.
    """

    current_username = None

    try:

        async for raw_message in websocket:

            # ==========================================
            # قراءة JSON
            # ==========================================

            try:
                data = json.loads(raw_message)

            except json.JSONDecodeError:

                await websocket.send(
                    json.dumps({
                        "type": "error",
                        "message":
                            "تنسيق البيانات غير صالح (Invalid JSON)."
                    })
                )

                continue


            msg_type = data.get("type")


            # ==========================================
            # 1. الانضمام Join
            # ==========================================

            if msg_type == "join":

                username = data.get(
                    "username",
                    ""
                ).strip()


                if not username:

                    await websocket.send(
                        json.dumps({
                            "type": "error",
                            "message":
                                "اسم المستخدم لا يمكن أن يكون فارغاً."
                        })
                    )

                    continue


                # محاولة تسجيل المستخدم
                if manager.add_user(
                    username,
                    websocket
                ):

                    current_username = username


                    # إرسال نجاح الانضمام
                    await websocket.send(
                        json.dumps({
                            "type": "join_success",
                            "username": username
                        })
                    )


                    # تحديث قائمة المستخدمين
                    await broadcast_users()


                    print(
                        f"[+] انضم المستخدم: {username}"
                    )


                else:

                    await websocket.send(
                        json.dumps({
                            "type": "error",
                            "message":
                                f"الاسم '{username}' مستخدم بالفعل، "
                                "اختر اسماً آخر."
                        })
                    )


            # ==========================================
            # 2. Group Chat
            # ==========================================

            elif msg_type == "group_message":

                # التأكد من تسجيل الدخول
                if not current_username:

                    await websocket.send(
                        json.dumps({
                            "type": "error",
                            "message":
                                "يجب تسجيل الدخول أولاً "
                                "قبل إرسال الرسائل."
                        })
                    )

                    continue


                message_text = data.get(
                    "text",
                    ""
                ).strip()


                # منع الرسائل الفارغة
                if not message_text:

                    await websocket.send(
                        json.dumps({
                            "type": "error",
                            "message":
                                "لا يمكن إرسال رسالة فارغة."
                        })
                    )

                    continue


                # إرسال الرسالة لجميع المستخدمين
                await broadcast_group_message(
                    current_username,
                    message_text
                )


            # ==========================================
            # 3. Private Chat
            # ==========================================

            elif msg_type == "message":

                # التأكد من تسجيل الدخول
                if not current_username:

                    await websocket.send(
                        json.dumps({
                            "type": "error",
                            "message":
                                "يجب تسجيل الدخول أولاً "
                                "قبل إرسال الرسائل."
                        })
                    )

                    continue


                recipient_name = data.get(
                    "to",
                    ""
                ).strip()


                message_text = data.get(
                    "text",
                    ""
                ).strip()


                # التحقق من البيانات
                if not recipient_name or not message_text:

                    await websocket.send(
                        json.dumps({
                            "type": "error",
                            "message":
                                "يجب تحديد المستقبل ومحتوى الرسالة."
                        })
                    )

                    continue


                # البحث عن المستخدم المستهدف
                recipient_socket = (
                    manager.get_user_socket(
                        recipient_name
                    )
                )


                if recipient_socket:

                    # ==================================
                    # إرسال الرسالة للمستقبل
                    # ==================================

                    incoming_payload = json.dumps({
                        "type": "message",
                        "from": current_username,
                        "to": recipient_name,
                        "text": message_text
                    })


                    await recipient_socket.send(
                        incoming_payload
                    )


                    # ==================================
                    # تأكيد للمرسل
                    # ==================================

                    sent_payload = json.dumps({
                        "type": "message_sent",
                        "from": current_username,
                        "to": recipient_name,
                        "text": message_text
                    })


                    await websocket.send(
                        sent_payload
                    )


                else:

                    await websocket.send(
                        json.dumps({
                            "type": "error",
                            "message":
                                f"المستخدم '{recipient_name}' "
                                "غير متصل حالياً."
                        })
                    )


            # ==========================================
            # 4. Leave
            # ==========================================

            elif msg_type == "leave":

                break


            # ==========================================
            # نوع رسالة غير معروف
            # ==========================================

            else:

                await websocket.send(
                    json.dumps({
                        "type": "error",
                        "message":
                            "نوع الرسالة غير معروف."
                    })
                )


    except websockets.exceptions.ConnectionClosed:

        # انقطاع الاتصال من المتصفح
        pass


    finally:

        # ==========================================
        # تنظيف الاتصال
        # ==========================================

        removed_user = (
            manager.remove_by_socket(
                websocket
            )
        )


        if removed_user:

            print(
                f"[-] غادر المستخدم: {removed_user}"
            )


            # تحديث قائمة المتصلين
            await broadcast_users()


async def start_websocket_server(
    host="0.0.0.0",
    port=8765
):
    """
    تشغيل سيرفر الـWebSocket.
    """

    server = await websockets.serve(
        handle_connection,
        host,
        port
    )

    print(
        f"[*] WebSocket Server يعمل على: "
        f"ws://{host}:{port}"
    )

    return server