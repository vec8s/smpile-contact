"""
UDP Server Educational Demo
===========================
يوضح هذا الملف كيفية عمل بروتوكول UDP (User Datagram Protocol) من طرف السيرفر.

أهم خصائص بروتوكول UDP:
------------------------
1. عديم الاتصال (Connectionless): لا يحتاج إلى Handshake قبل إرسال البيانات.
2. غير موثوق (Unreliable): لا يضمن وصول الحزم ولا ترتيبها، ولا يعيد إرسال الحزم المفقودة.
3. خفيف وسريع (Fast & Lightweight): مثالي للألعاب، الصوت، الفيديو المباشر، وتطبيقات الوقت الحقيقي البسيطة.
"""

import socket

HOST = "127.0.0.1"
PORT = 9993

def run_udp_server():
    # 1. إنشاء Socket بنوع UDP (SOCK_DGRAM)
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    # 2. ربط المنفذ بالسيرفر (Bind)
    server_sock.bind((HOST, PORT))
    
    print("=" * 60)
    print("                  UDP Server (سيرفر UDP)")
    print("=" * 60)
    print(f"[*] سيرفر UDP يستمع على: {HOST}:{PORT}")
    print("[*] (لاحظ: UDP لا يستخدم listen() أو accept() لأنه لا ينشئ اتصال دائم)")
    print("[*] بانتظار استلام رسائل (Datagrams)...\n")

    try:
        while True:
            # 3. استقبال البيانات وعنوان المرسل مباشرة عبر recvfrom
            data, client_address = server_sock.recvfrom(1024)
            message = data.decode()
            print(f"[+] تم استلام رسالة من {client_address}: {message}")

            # 4. الرد على نفس العنوان مباشرة عبر sendto
            reply = f"مرحباً من سيرفر UDP! تم استلام رسالتك: '{message}'"
            server_sock.sendto(reply.encode(), client_address)
            print(f"[*] تم إرسال الرد إلى {client_address}")
            print("-" * 50)
    except KeyboardInterrupt:
        print("\n[*] جاري إيقاف سيرفر UDP...")
    finally:
        server_sock.close()
        print("[*] تم إغلاق سيرفر UDP.")


if __name__ == "__main__":
    run_udp_server()
