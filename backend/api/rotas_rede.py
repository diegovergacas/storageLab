from fastapi import APIRouter, Request

from backend.rede import ips_locais

router = APIRouter(prefix="/api/rede", tags=["rede"])


@router.get("")
def rede(request: Request) -> dict:
    porta = request.url.port or 8000
    esquema = request.url.scheme or "https"
    urls = [f"{esquema}://{ip}:{porta}" for ip in ips_locais()]
    return {"urls": urls}
