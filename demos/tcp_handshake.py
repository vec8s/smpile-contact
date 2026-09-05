"""
TCP 3-Way Handshake Educational Demo
====================================
هذا البرنامج يوضح بشكل تطبيقي ومفهوم كيف يتم إنشاء اتصال TCP (TCP 3-Way Handshake).

ملاحظة تعليمية مهمة جداً:
-------------------------
تطبيق Python لا يقوم بإنشاء حزم (Packets) الـ SYN أو ACK بشكل يدوي.
بل يتم ذلك تلقائياً بواسطة طبقة TCP في نظام التشغيل (Operating System TCP Stack)
عندما يستدعي البرنامج دالتي: connect() و accept().

مخطط المصافحة الثلاثية (3-Way Handshake):
----------------------------------------
   Client (العميل)                               Server (السيرفر)
         │                                              │
         │  1. [OS TCP Stack] SYN                      │
         ├─────────────────────────────────────────────>│
         │                                              │
         │  2. [OS TCP Stack] SYN-ACK                   │
         │<─────────────────────────────────────────────┤
         │                                              │
         │  3. [OS TCP Stack] ACK                       │
         ├─────────────────────────────────────────────>│
         │                                              │
         ▼                                              ▼
  [الاتصال جاهز ESTABLISHED]                      [الاتصال جاهز ESTABLISHED]
"""

import socket
import threading
import time

HOST = "127.0.0.1"
PORT = 9991


def run_tcp_server():
    """كود السيرفر لمحاكاة استقبال اتصال TCP"""
    # 1. إنشاء Socket بنوع TCP (SOCK_STREAM)
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    # 2. ربط السيرفر بالعنوان والمنفذ (Bind)
    server_sock.bind((HOST, PORT))
    
    # 3. الاستماع للاتصالات الواردة (Listen)
    server_sock.listen(1)
    print(f"[Server] السيرفر يستمع الآن على {HOST}:{PORT} وبانتظار طلب اتصال...")

    # 4. قبول الاتصال (Accept) - هنا ينتظر السيرفر اكتمال الـ 3-Way Handshake من نظام التشغيل
    conn, client_address = server_sock.accept()
    print(f"[Server] تم قبول الاتصال بنجاح من: {client_address}")
    print("[Server] (نظام التشغيل استقبل SYN وأرسل SYN-ACK واستقبل ACK وأكمل المصافحة)")

    # إرسال رسالة ترحيبية بعد اكتمال الاتصال
    conn.sendall(b"Hello from TCP Server! Handshake was successful.")
    
    # إغلاق الاتصال
    time.sleep(1)
    conn.close()
    server_sock.close()
    print("[Server] تم إغلاق سيرفر الـ TCP.")


def run_tcp_client():
    """كود العميل لمحاكاة طلب اتصال TCP"""
    time.sleep(0.5)  # انتظار تشغيل السيرفر
    
    print("\n--- بدء مرحلة الـ TCP 3-Way Handshake ---")
    print("[Client] العميل ينشئ كائن Socket...")
    client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    print(f"[Client] العميل يستدعي connect({HOST}, {PORT})...")
    print("[Client] (يقوم نظام التشغيل بإرسال حزمة SYN إلى السيرفر...)")
    
    # دالة connect() تحفز نظام التشغيل لبدء المصافحة الثلاثية
    client_sock.connect((HOST, PORT))

    print("[Client] تم الاتصال بنجاح (Connection Established)!")
    print("[Client] (استقبل نظام التشغيل SYN-ACK ورد بـ ACK تلقائياً)\n")

    # استقبال البيانات بعد نجاح الاتصال
    data = client_sock.recv(1024)
    print(f"[Client] رسالة مستلمة عبر اتصال الـ TCP: {data.decode()}")

    client_sock.close()
    print("[Client] تم إغلاق العميل.")


if __name__ == "__main__":
    print("=" * 65)
    print("       تجربة تعليمية: مصافحة الـ TCP الثلاثية (3-Way Handshake)")
    print("=" * 65)

    # تشغيل السيرفر في Thread والعميل في الـ Thread الرئيسي
    server_thread = threading.Thread(target=run_tcp_server)
    server_thread.start()

    run_tcp_client()
    server_thread.join()

    print("=" * 65)
    print("خلاصة:")
    print("1. الخطوة الأولى: العميل يرسل حزمة SYN لبدء الاتصال.")
    print("2. الخطوة الثانية: السيرفر يرد بحزمة SYN-ACK للموافقة والمزامنة.")
    print("3. الخطوة الثالثة: العميل يرد بحزمة ACK لتأكيد فتح قناة الاتصال.")
    print("كل هذه الحزم يديرها نظام التشغيل (OS) وليس كود Python مباشرة.")
    print("=" * 65)
