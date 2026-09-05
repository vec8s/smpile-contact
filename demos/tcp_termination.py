"""
TCP 4-Way Termination Educational Demo
======================================
هذا البرنامج يوضح مفهوم إنهاء اتصال الـ TCP (TCP 4-Way Handshake / Teardown).

لماذا يتطلب إنهاء اتصال TCP أربع خطوات (4-Way)؟
-----------------------------------------------
اتصال TCP هو اتصال ثنائي الاتجاه بالكامل (Full-Duplex)، مما يعني أن نقل البيانات
من العميل للسيرفر منفصل ومستقل عن نقل البيانات من السيرفر للعميل.
لذلك، يجب إغلاق كل اتجاه على حدة بحزمتي (FIN و ACK).

مخطط إنهاء الاتصال الرباعي (4-Way Termination):
----------------------------------------------
   Client (العميل)                               Server (السيرفر)
         │                                              │
         │  1. [OS TCP Stack] FIN                      │
         ├─────────────────────────────────────────────>│
         │                                              │
         │  2. [OS TCP Stack] ACK                      │
         │<─────────────────────────────────────────────┤
         │                                              │
         │  3. [OS TCP Stack] FIN                      │
         │<─────────────────────────────────────────────┤
         │                                              │
         │  4. [OS TCP Stack] ACK                      │
         ├─────────────────────────────────────────────>│
         │                                              │
         ▼                                              ▼
    [الاتصال مغلق CLOSED]                          [الاتصال مغلق CLOSED]
"""

import socket
import threading
import time

HOST = "127.0.0.1"
PORT = 9992


def run_tcp_server():
    """كود السيرفر لمحاكاة استقبال وإغلاق اتصال TCP"""
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_sock.bind((HOST, PORT))
    server_sock.listen(1)

    conn, client_address = server_sock.accept()
    print(f"[Server] اتصال نشط مع العميل: {client_address}")

    # السيرفر يستقبل البيانات
    data = conn.recv(1024)
    print(f"[Server] تم استلام: {data.decode()}")

    # عندما يرسل العميل FIN، دالة recv() ترجع قيمة فارغة b"" إشارة إلى نهاية التدفق
    data_after_close = conn.recv(1024)
    if not data_after_close:
        print("\n--- مرحلة إنهاء الاتصال (TCP Termination) ---")
        print("[Server] استقبل نظام التشغيل حزمة FIN من العميل، وأرسل ACK تلقائياً (إغلاق اتجاه العميل->السيرفر).")
        print("[Server] السيرفر يقوم الآن بإغلاق جهته واستدعاء conn.close()...")
        print("[Server] (نظام التشغيل يرسل FIN من السيرفر إلى العميل)")

    conn.close()
    server_sock.close()
    print("[Server] تم إغلاق جهة السيرفر بالكامل.")


def run_tcp_client():
    """كود العميل لمحاكاة إغلاق اتصال TCP"""
    time.sleep(0.5)
    client_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client_sock.connect((HOST, PORT))
    
    # إرسال رسالة عادية
    client_sock.sendall(b"Hello! I am going to disconnect soon.")
    time.sleep(1)

    print("[Client] العميل يستدعي client_sock.close()...")
    print("[Client] (يقوم نظام تشغيل العميل بإرسال FIN ينتظر ACK، ثم يستقبل FIN السيرفر ويرد بـ ACK)")
    client_sock.close()
    print("[Client] تم إغلاق كائن الـ Socket لدى العميل.")


if __name__ == "__main__":
    print("=" * 65)
    print("       تجربة تعليمية: إنهاء اتصال الـ TCP الرباعي (4-Way Handshake)")
    print("=" * 65)

    server_thread = threading.Thread(target=run_tcp_server)
    server_thread.start()

    run_tcp_client()
    server_thread.join()

    print("=" * 65)
    print("ملاحظة هامة للفرق بين WebSocket Disconnect و TCP Termination:")
    print("1. عندما تضغط 'Disconnect' في المتصفح، يرسل المتصفح أولاً WebSocket Close Frame (Application Layer).")
    print("2. بعد ذلك، يقوم كرت الشبكة ونظام التشغيل بإغلاق اتصال الـ TCP الفعلي بحزم FIN / ACK (Transport Layer).")
    print("=" * 65)
