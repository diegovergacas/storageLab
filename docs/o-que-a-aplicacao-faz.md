# O que a aplicação faz

O StorageLab é o controle de estoque do laboratório: o que entra, o que está na prateleira, o que foi emprestado para outro lab e o que acabou.

A ideia original era um sistema web, no celular Android e no computador, com os dados numa planilha do Google Drive. Nesta fase de criação, para não ter custo de nuvem, o **PC do lab é o servidor** e o celular fala com ele pela **rede de casa**. Os dados ficam neste computador. Drive e uma conta Google só da aplicação ficam para a produção.

A linguagem escolhida foi **Python** (melhor encaixe com web, OCR e, no futuro, as APIs do Google). Java ficou de fora.

---

## Duas caras, o mesmo estoque

```
  CELULAR  /                      PC  /gestao
  usuario comum do lab            quem gerencia
  so leitura e cadastro           lista, emprestimo, baixa, edicao
         |                               |
         +---------------+---------------+
                         v
              catalogo eterno + quantidades
```

O celular **não mostra** gestão nem a lista da prateleira. Isso é de propósito: quem conta frasco no corredor não mexe no painel.

---

## O que o celular faz

1. Abre a câmera e lê **qualquer código de barras ou QR** (não só EAN-13).
2. Se o código **já passou pelo lab**, vai para a **conferência**: mostra nome, marca, quanto tem na prateleira e quanto está emprestado.
3. Se o código **nunca esteve no catálogo**, tira **foto do rótulo**. O PC lê o texto com **pytesseract** (OCR) e sugere nome e marca. A pessoa **corrige no próprio smartphone** e salva.
4. Sem código não grava. O código é a identidade. Assim, da próxima vez, só a leitura resolve.

Na conferência dá para:

- confirmar **entrada (+1)** — chegou mais um frasco
- marcar **Acabou (-1)** — saiu da prateleira, acabou
- ler outro código

A unidade, por enquanto, é o **frasco** (cada leitura soma ou tira 1). Controlar o que sobrou dentro do frasco (ml, g) ficou para depois.

A câmera no Android só abre em **HTTPS**. Por isso o servidor local usa certificado. A leitura só vale depois de **várias capturas iguais**, para o código errado da câmera não virar produto novo.

---

## O que o PC faz (gestão)

No navegador, em `/gestao`, quem gerencia:

- vê o catálogo (mesmo com prateleira zerada)
- busca por código, nome ou marca
- cadastra na mão (código + nome; a marca é opcional)
- **+1**, **Emprestar**, **Devolver**, **Acabou**, **Editar**

```
+1          prateleira +1
Emprestar   prateleira -1   emprestado +1
Devolver    prateleira +1   emprestado -1
Acabou      prateleira -1   (emprestado nao mexe)
```

Empréstimo e “acabou” não se misturam. Emprestado ainda é do lab, só está em outro lugar. Acabou é baixa.

---

## O catálogo é eterno

Há dois arquivos:

| Arquivo | Papel |
|---|---|
| `dados/catalogo.json` | O que **já teve no lab**: código, nome, marca, foto. Não some. |
| `dados/estoque.json` | O que **tem agora**: prateleira e emprestado. |

Se o produto acabou e depois chega de novo, o celular lê o mesmo código e **não pede cadastro novo**. Só soma 1 na prateleira. O histórico de “já conhecemos esse reagente” fica.

---

## O que ainda não é desta fase

- Planilha e fotos no **Google Drive** (conta de teste pessoal, depois conta só da aplicação, com conta robô no servidor)
- Controlar **volume/massa** que sobrou no frasco
- Coluna ou aba de histórico de baixas (hoje “acabou” só diminui a prateleira)
- **IA** no rótulo: neste ThinkPad T450 (CPU sem placa dedicada, 11 GB de RAM) um modelo de visão local esquenta e emperra. O caminho leve é deixar o Tesseract + correção humana; IA na nuvem, se entrar, é depois
- Login e permissão de verdade (hoje a “trava” da gestão é não aparecer no celular)

---

## Como as peças se encaixam

```
foto / codigo
     |
     v
frontend (web no Chrome)
     |
     v
backend Python (FastAPI neste PC)
     |
     +--> dominio (regras: +1, emprestar, codigo)
     +--> OCR (pytesseract, so no primeiro cadastro)
     +--> persistencia
              |
              +--> catalogo.json   (eterno)
              +--> estoque.json    (quantidade)
              +--> fotos/          (rotulos)
```

Em resumo: o lab aponta o celular, o código decide se é conhecido ou novo, o PC guarda para sempre o que já entrou, e a mesa no navegador empresta, devolve, dá baixa e corrige o cadastro.
