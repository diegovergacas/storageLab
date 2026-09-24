import uvicorn

from backend.https_local import garantir_certificado


def main() -> None:
    chave, cert = garantir_certificado()
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_keyfile=str(chave),
        ssl_certfile=str(cert),
    )


if __name__ == "__main__":
    main()
