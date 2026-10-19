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
- `backend/persistencia/` — JSON hoje; a planilha `Pedidos de Compra Labpesq.xlsx` sementeia o catálogo. Drive fica para depois.

## Arquivos de dados

| Arquivo | Papel |
|---|---|
| `dados/catalogo.json` | Eterno: código de leitura + colunas da planilha, incluindo código do fornecedor, unidade, entrega e localização. Nunca some. |
| `dados/estoque.json` | Quantidade agora: prateleira e emprestado. |
| `dados/pedidos.json` | Pedidos importados da planilha (não é estoque). |

## APIs principais

- `GET /api/itens` — catálogo + quantidades
- `GET /api/itens/pendentes` — produtos da planilha ainda sem código de barras
- `POST /api/itens/importar-planilha` — relê a planilha (idempotente)
- `POST /api/itens/vincular` — liga um `PLAN-` ao código de barras lido
- `GET /api/itens/localizar?codigo=`
- `POST /api/itens` — primeiro cadastro (grava no catálogo)
- `POST /api/itens/{codigo}/entrada` — soma a quantidade informada à prateleira
- `POST /api/itens/{codigo}/emprestar`
- `POST /api/itens/{codigo}/devolver`
- `POST /api/itens/{codigo}/acabou`
- `PATCH /api/itens/{codigo}` — editar nome/empresa
- `POST /api/ocr` — foto do rótulo
