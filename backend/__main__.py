import os

import uvicorn

from backend.https_local import garantir_certificado


def main() -> None:
    chave, cert = garantir_certificado()
    recarregar = os.environ.get("STORAGELAB_RELOAD", "1") == "1"
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=recarregar,
        ssl_keyfile=str(chave),
        ssl_certfile=str(cert),
    )


if __name__ == "__main__":
    main()
