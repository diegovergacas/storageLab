import subprocess
from pathlib import Path

from backend.persistencia.caminhos import DADOS
from backend.rede import ips_locais

CERTS = DADOS / "certs"
CHAVE = CERTS / "dev.key"
CERT = CERTS / "dev.crt"


def garantir_certificado() -> tuple[Path, Path]:
    CERTS.mkdir(parents=True, exist_ok=True)
    if CHAVE.exists() and CERT.exists():
        return CHAVE, CERT

    nomes = ["DNS:localhost", "IP:127.0.0.1"]
    for ip in ips_locais():
        nomes.append(f"IP:{ip}")
    san = ",".join(nomes)
    subprocess.run(
        [
            "openssl",
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-sha256",
            "-days",
            "825",
            "-nodes",
            "-keyout",
            str(CHAVE),
            "-out",
            str(CERT),
            "-subj",
            "/CN=StorageLab",
            "-addext",
            f"subjectAltName={san}",
        ],
        check=True,
    )
    return CHAVE, CERT
