# Arquitetura

```
estoque/
+-- frontend/          telas (celular e gestao)
+-- backend/           API, regras, OCR, persistencia
+-- dados/             catalogo, estoque, fotos
+-- docs/              documentacao
```

## Camadas

```
celular ou PC  -->  frontend  -->  backend/api  -->  dominio  -->  persistencia  -->  dados
```

- `frontend/` — `/` celular; `/gestao` mesa
- `backend/api/` — rotas HTTP
- `backend/dominio/` — código de barras, item, rótulo
- `backend/servicos/ocr.py` — pytesseract no PC
- `backend/persistencia/` — JSON hoje; planilha do Drive fica para depois

## Dois arquivos de dados

| Arquivo | Papel |
|---|---|
| `dados/catalogo.json` | Eterno: código, nome, marca, foto. Nunca some. |
| `dados/estoque.json` | Quantidade agora: prateleira e emprestado. |

## APIs principais

- `GET /api/itens` — catálogo + quantidades
- `GET /api/itens/localizar?codigo=`
- `POST /api/itens` — primeiro cadastro (grava no catálogo)
- `POST /api/itens/{codigo}/entrada` — +1
- `POST /api/itens/{codigo}/emprestar`
- `POST /api/itens/{codigo}/devolver`
- `POST /api/itens/{codigo}/acabou`
- `PATCH /api/itens/{codigo}` — editar nome/marca
- `POST /api/ocr` — foto do rótulo
