"""
HTTP Web Server (سيرفر صفحات الويب)
-----------------------------------
هذا الملف مسؤول عن:
1. تشغيل سيرفر HTTP بسيط باستخدام مكتبات Python القياسية (http.server).
2. تقديم ملفات الواجهة الأمامية (HTML, CSS, JavaScript) الموجودة في مجلد web/.
3. الاستماع على 0.0.0.0 لتمكين جميع أجهزة الشبكة المحلية (LAN) من فتح الموقع عبر المتصفح.
"""

import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

class WebDirectoryHandler(SimpleHTTPRequestHandler):
    """متحكم لتقديم الملفات حصراً من مجلد web/"""
    def __init__(self, *args, **kwargs):
        # تحديد المسار إلى مجلد web
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        web_dir = os.path.join(base_dir, "web")
        super().__init__(*args, directory=web_dir, **kwargs)

    def log_message(self, format, *args):
        # إسكات السجلات المتكررة للحفاظ على نظافة الطرفية
        pass


def run_http_server(host="0.0.0.0", port=8000):
    """دالة تشغيل سيرفر الـ HTTP."""
    server_address = (host, port)
    httpd = HTTPServer(server_address, WebDirectoryHandler)
    print(f"[*] HTTP Web Server يعمل على: http://{host}:{port}")
    httpd.serve_forever()


def start_http_in_background(host="0.0.0.0", port=8000):
    """تشغيل سيرفر HTTP داخل Thread منفصل ليعمل بالتوازي مع WebSocket."""
    thread = threading.Thread(target=run_http_server, args=(host, port), daemon=True)
    thread.start()
    return thread
