import socket


def ips_locais() -> list[str]:
    encontrados: set[str] = set()
    try:
        info = socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)
    except socket.gaierror:
        info = []
    for item in info:
        ip = item[4][0]
        if ip.startswith("127.") or ip.startswith("172.17."):
            continue
        encontrados.add(ip)

    conexao = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        conexao.connect(("1.1.1.1", 80))
        ip = conexao.getsockname()[0]
        if not ip.startswith("127."):
            encontrados.add(ip)
    except OSError:
        pass
    finally:
        conexao.close()

    return sorted(encontrados)
