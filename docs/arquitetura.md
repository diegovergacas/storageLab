# Arquitetura

## Camadas

```text
Celular ou computador
        ↓
Frontend HTML, CSS e JavaScript
        ↓
API FastAPI
        ↓
Domínio: códigos, itens e regras de estoque
        ↓
Persistência: JSON, planilha e fotos
```

- `frontend/index.html` e `frontend/js/telas.js` atendem o operador no celular.
- `frontend/gestao.html` e `frontend/js/gestao.js` atendem a gestão no computador.
- `backend/api/` expõe as rotas HTTP e valida os dados recebidos.
- `backend/dominio/` normaliza códigos, monta itens e aplica as regras de quantidade.
- `backend/persistencia/planilha_compras.py` lê a aba `Compras` de `LISTA INSUMOS LAB PESQ.xlsx`.
- `backend/persistencia/repositorio_json.py` mantém catálogo, estoque, pedidos e fotos.
- `backend/servicos/ocr.py` usa Tesseract para sugerir texto de rótulos.

## Identificadores

O código de barras ou QR Code é a identidade operacional do item. Produtos importados que ainda não receberam código de leitura usam temporariamente um identificador interno iniciado por `PLAN-`.

O código da coluna `Código` da planilha é salvo como código do fornecedor e não substitui o código lido pelo celular.

## Dados de um produto

Além do nome e empresa, o catálogo suporta solicitante, código do fornecedor, quantidade e unidade de compra, data, previsão, verba, status de entrega, data de entrega, sala e local de armazenamento.

O valor é armazenado de forma separada em `valor_brl` e `valor_usd`. Para compatibilidade com registros anteriores, o campo histórico `valor` continua sendo interpretado ao mostrar o item.

## APIs principais

| Rota | Finalidade |
|---|---|
| `GET /api/itens` | Lista catálogo com estoque atual. |
| `GET /api/itens/localizar?codigo=` | Procura item por código lido ou digitado. |
| `GET /api/itens/pendentes` | Lista produtos importados ainda sem código de leitura. |
| `POST /api/itens/importar-planilha` | Reimporta a planilha de compras. |
| `POST /api/itens/vincular` | Liga um código lido a um item pendente. |
| `POST /api/itens` | Cria um produto novo. |
| `PATCH /api/itens/{codigo}` | Atualiza os dados cadastrados. |
| `POST /api/itens/{codigo}/entrada` | Soma a quantidade informada à prateleira. |
| `POST /api/itens/{codigo}/emprestar` | Move uma unidade para empréstimo. |
| `POST /api/itens/{codigo}/devolver` | Devolve uma unidade à prateleira. |
| `POST /api/itens/{codigo}/acabou` | Dá baixa de uma unidade da prateleira. |
| `POST /api/ocr` | Recebe foto do rótulo e devolve sugestão OCR. |

## Segurança local

O servidor usa HTTPS porque navegadores Android exigem contexto seguro para liberar a câmera. O certificado é local e fica em `dados/certs/`.
