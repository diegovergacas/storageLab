from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from backend.api.rotas_fotos import router as rotas_fotos
from backend.api.rotas_itens import router as rotas_itens
from backend.api.rotas_ocr import router as rotas_ocr
from backend.api.rotas_rede import router as rotas_rede
from backend.persistencia.caminhos import FRONTEND, FOTOS

FOTOS.mkdir(parents=True, exist_ok=True)

class PermissaoCamera(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        resposta = await call_next(request)
        resposta.headers["Permissions-Policy"] = "camera=(self)"
        return resposta


app = FastAPI(title="StorageLab")
app.add_middleware(PermissaoCamera)
app.include_router(rotas_itens)
app.include_router(rotas_fotos)
app.include_router(rotas_ocr)
app.include_router(rotas_rede)
app.mount("/css", StaticFiles(directory=FRONTEND / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND / "js"), name="js")
app.mount("/fotos", StaticFiles(directory=FOTOS), name="fotos")


@app.get("/")
def home() -> FileResponse:
    return FileResponse(FRONTEND / "index.html")


@app.get("/gestao")
def gestao() -> FileResponse:
    return FileResponse(FRONTEND / "gestao.html")
