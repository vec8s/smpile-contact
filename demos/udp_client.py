import socket

server_ip = input("Enter server IP: ")

PORT = 9993

client_socket = socket.socket(
    socket.AF_INET,
    socket.SOCK_DGRAM
)

client_socket.settimeout(5)

message = input("Enter message: ")

client_socket.sendto(
    message.encode("utf-8"),
    (server_ip, PORT)
)

try:
    data, address = client_socket.recvfrom(1024)

    response = data.decode("utf-8")

    print(f"Server response: {response}")

except socket.timeout:
    print("No response from server.")

finally:
    client_socket.close()