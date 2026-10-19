# O que a aplicação faz

O StorageLab controla os insumos do laboratório: itens recebidos, disponíveis na prateleira, emprestados e baixados por término. O catálogo não perde um produto já conhecido, mesmo quando sua quantidade chega a zero.

O PC do laboratório funciona como servidor local. Celular e computador acessam o sistema na mesma rede Wi-Fi, por HTTPS.

## Operação pelo celular

O operador pode ler código de barras ou QR Code pela câmera. Caso a câmera não consiga ler, ele digita o código.

- Quando o código já existe, o sistema mostra nome, empresa, localização, itens na prateleira e itens emprestados.
- O operador informa a quantidade recebida para registrar a entrada.
- Também pode registrar que um frasco acabou ou abrir a edição dos dados cadastrados.
- Quando o código é novo, o operador escolhe entre cadastro manual ou foto do rótulo. A foto usa OCR para sugerir nome e empresa, mas a revisão humana continua necessária.
- Se o produto já estiver pendente na lista de compras, a seleção preenche automaticamente o formulário. O operador revisa os dados, salva e vincula o código lido ao produto.

O cadastro manual possui: solicitante, reagente/material, código do fornecedor, quantidade, unidade, empresa, data, valor em reais ou dólares, previsão, verba, status e data de entrega, sala e local de armazenamento.

## Gestão pelo computador

Em `/gestao`, a pessoa responsável pode:

- consultar, buscar e ordenar a tabela por suas colunas;
- navegar lateralmente pela tabela sem perder os títulos das colunas;
- clicar no nome de um produto ou em **Editar** para abrir o cadastro já preenchido;
- cadastrar itens manualmente;
- atualizar os pedidos a partir da planilha de compras;
- vincular um código de barras a um produto pendente;
- registrar entrada, empréstimo, devolução e baixa por término.

## Regras de quantidade

| Ação | Prateleira | Emprestado |
|---|---:|---:|
| Entrada | soma a quantidade informada | não altera |
| Emprestar | diminui 1 | soma 1 |
| Devolver | soma 1 | diminui 1 |
| Acabou | diminui 1 | não altera |

A quantidade da planilha representa a compra registrada. A quantidade na prateleira representa os frascos físicos disponíveis no laboratório.

## Valores e moedas

A gestão separa o valor da compra em duas colunas: `R$` e `US$`.

- Valores que começam com `US$`, `U$` ou `USD` são mostrados em `US$`.
- Valores que começam com `R$` ou não possuem símbolo de moeda são mostrados em `R$`.
- Verba permanece uma única coluna, pois identifica a fonte de financiamento.

## Dados permanentes

| Arquivo | Papel |
|---|---|
| `dados/catalogo.json` | Dados e identificação dos produtos já conhecidos pelo laboratório. |
| `dados/estoque.json` | Quantidades em prateleira e emprestadas. |
| `dados/pedidos.json` | Pedidos lidos da planilha. |
| `dados/fotos/` | Fotos de rótulos usadas no cadastro. |

## Fora do escopo atual

- Login e permissões por usuário.
- Histórico detalhado de cada movimentação.
- Controle de volume ou massa restante dentro de um frasco.
- Sincronização com Google Drive.
- Uso de IA em nuvem para leitura de rótulos.
