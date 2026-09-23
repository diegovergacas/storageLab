from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.rotas_fotos import router as rotas_fotos
from backend.api.rotas_itens import router as rotas_itens
from backend.persistencia.caminhos import FRONTEND, FOTOS

FOTOS.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="StorageLab")
app.include_router(rotas_itens)
app.include_router(rotas_fotos)
app.mount("/css", StaticFiles(directory=FRONTEND / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND / "js"), name="js")
app.mount("/fotos", StaticFiles(directory=FOTOS), name="fotos")


@app.get("/")
def home() -> FileResponse:
    return FileResponse(FRONTEND / "index.html")
