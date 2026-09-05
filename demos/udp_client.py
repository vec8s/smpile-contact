"""
UDP Client Educational Demo
===========================
يوضح هذا الملف كيفية عمل بروتوكول UDP من طرف العميل (Client).

الفرق الجوهري بين TCP Client و UDP Client:
------------------------------------------
- في TCP Client: يجب استدعاء connect() لعمل 3-Way Handshake قبل إرسال أي بايت.
- في UDP Client: لا يوجد connect() أو مصافحة، بل يتم إرسال البيانات مباشرة عبر sendto().
"""

import socket

HOST = "127.0.0.1"
PORT = 9993

def run_udp_client():
    # 1. إنشاء Socket بنوع UDP (SOCK_DGRAM)
    client_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    # تحديد مهلة انتظار (Timeout) للرد (لأنه في UDP قد تضيع الحزمة ولا يصل رد أبداً)
    client_sock.settimeout(3.0)

    print("=" * 60)
    print("                  UDP Client (عميل UDP)")
    print("=" * 60)

    message = "السلام عليكم، هذه رسالة تجريبية عبر بروتوكول UDP!"
    server_address = (HOST, PORT)

    print(f"[*] جاري إرسال الرسالة إلى السيرفر {server_address} مباشرة عبر sendto()...")
    print("[*] (لاحظ: لم نقم بعمل Handshake ولا يوجد اتصال مفتوح مسبقاً)")

    try:
        # 2. إرسال الرسالة مباشرة
        client_sock.sendto(message.encode(), server_address)
        print("[+] تم إرسال حزمة الـ Datagram بنجاح.")

        # 3. استقبال الرد من السيرفر
        print("[*] بانتظار الرد من السيرفر...")
        data, server = client_sock.recvfrom(1024)
        print(f"[+] تم استلام الرد من {server}: {data.decode()}")

    except socket.timeout:
        print("[!] انتهت مهلة الانتظار ولم يصل رد (خصيصة UDP: قد تفقد الحزمة دون تنبيه).")
    except Exception as e:
        print(f"[!] خطأ: {e}")
    finally:
        client_sock.close()
        print("[*] تم إغلاق Socket العميل.")


if __name__ == "__main__":
    run_udp_client()
