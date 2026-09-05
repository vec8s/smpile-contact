"""
نقطة التشغيل الرئيسية للمشروع (Main Entry Point)
==============================================
تشغيل السيرفر بالكامل:
1. سيرفر الويب HTTP لتقديم ملفات الواجهة (HTML, CSS, JS).
2. سيرفر الـ WebSocket لاستقبال الرسائل والمحادثات الحية.
"""

import asyncio
import socket
from server.server import start_http_in_background
from server.websocket_server import start_websocket_server

def get_local_ip():
    """
    استخراج عنوان IP المحلي للجهاز في الشبكة المحلية (LAN/Wi-Fi).
    تساعد في معرفة الرابط الذي سيفتحه الأجهزة الأخرى في المتصفح.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # محاولة الاتصال بعنوان وهمي لمعرفة كرت الشبكة الفعال
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


async def main():
    local_ip = get_local_ip()
    http_port = 8000
    ws_port = 8765

    print("=" * 60)
    print("   Simple Contact — Local Network Chat Application")
    print("=" * 60)
    print(f"[i] عنوان IP لجهازك على الشبكة المحلية: {local_ip}")
    print("-" * 60)
    print(f"[1] لفتح التطبيق من هذا الجهاز (السيرفر):")
    print(f"    http://localhost:{http_port}  أو  http://{local_ip}:{http_port}")
    print("-" * 60)
    print(f"[2] لفتح التطبيق من أجهزة أخرى (Clients) على نفس شبكة Wi-Fi:")
    print(f"    http://{local_ip}:{http_port}")
    print("=" * 60)

    # 1. تشغيل سيرفر HTTP في خلفية البرنامج (Thread)
    start_http_in_background(host="0.0.0.0", port=http_port)

    # 2. تشغيل سيرفر WebSocket باستخدام Asyncio
    ws_server = await start_websocket_server(host="0.0.0.0", port=ws_port)

    # إبقاء السيرفر يعمل حتى يتم إيقافه يدوياً عبر Ctrl+C
    try:
        await asyncio.Future()  # تشغيل دائم
    except (asyncio.CancelledError, KeyboardInterrupt):
        print("\n[*] جاري إيقاف السيرفر...")
    finally:
        ws_server.close()
        await ws_server.wait_closed()
        print("[*] تم إيقاف السيرفر بنجاح.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] تم الإغلاق بواسطة المستخدم.")
