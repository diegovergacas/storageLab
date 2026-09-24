# Uso

## Subir o servidor (neste PC)

```bash
cd ~/Documentos/estoque
source .venv/bin/activate
python -m backend
```

O app abre em HTTPS na porta 8000. Se essa porta estiver ocupada, use a 8443:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8443 --reload \
  --ssl-keyfile dados/certs/dev.key --ssl-certfile dados/certs/dev.crt
```

Celular e PC precisam estar na mesma rede Wi-Fi. O certificado é local: no Chrome, aceite o aviso uma vez.

## Celular (`/`)

Para quem usa o lab no dia a dia.

1. Abrir o endereço HTTPS do PC no Chrome do Android.
2. **Ler codigo** (ou digitar).
3. Se o produto já está no catálogo: conferência, depois **+1**, **Acabou (-1)** ou ler outro.
4. Se for a primeira vez no lab: foto do rótulo (OCR), corrigir nome/marca, salvar.

A tela do celular não mostra a lista do estoque nem a gestão.

## Gestão no PC (`/gestao`)

Só no computador, no navegador: `https://127.0.0.1:8443/gestao` (ou a porta que estiver no ar).

- Buscar, cadastrar na mão (código obrigatório)
- **+1**, **Emprestar**, **Devolver**, **Acabou**, **Editar**

```
+1          prateleira +1
Emprestar   prateleira -1   emprestado +1
Devolver    prateleira +1   emprestado -1
Acabou      prateleira -1
```

**Acabou** não apaga o produto. Ele fica no catálogo. Na próxima leitura, só soma de novo.
