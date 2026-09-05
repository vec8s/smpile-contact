import socket

HOST = "0.0.0.0"
PORT = 9993

server_socket = socket.socket(
    socket.AF_INET,
    socket.SOCK_DGRAM
)

server_socket.bind((HOST, PORT))

print(f"UDP Server started on {HOST}:{PORT}")
print("Waiting for messages...")

while True:

    data, address = server_socket.recvfrom(1024)

    message = data.decode("utf-8")

    print(
        f"Received from "
        f"{address[0]}:{address[1]}: {message}"
    )

    response = f"Server received: {message}"

    server_socket.sendto(
        response.encode("utf-8"),
        address
    )