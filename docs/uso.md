# Uso

## Docker Desktop (recomendado)

Na pasta acima desta (`storageLab/`), execute:

```powershell
docker compose up --build -d
```

O aplicativo estará em `https://localhost:8000`; a gestão fica em
`https://localhost:8000/gestao`. Os arquivos gerados pelo aplicativo são
persistidos em `storageLab/dados/`, fora do contêiner.

Para acompanhar ou parar o serviço:

```powershell
docker compose logs -f
docker compose down
```

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
2. Escolher temporariamente o perfil de desenvolvimento: Aluno, Técnico,
   Gerente ou Desenvolvedor.
3. Criar pedidos e registrar recebimentos.
4. Técnico, gerente e desenvolvedor também podem cadastrar os dados do pedido.

A leitura e o cadastro por código de barras foram removidos desta tela nesta
fase. Eles poderão voltar em um fluxo futuro, se necessário.

## Gestão no PC (`/gestao`)

Só no computador, no navegador: `https://127.0.0.1:8443/gestao` (ou a porta que estiver no ar).

- Buscar, cadastrar na mão (código obrigatório)
- **Atualizar da planilha**: as colunas da planilha viram a base do estoque (solicitante, quantidade, empresa, data, valor, previsão, verba, entregue)
- A **Quantidade** da planilha fica no cadastro; **Prateleira** é o contador de frasco (+1 / Acabou)
- Ligar código de barras a um item `PLAN-` em **Editar**
- **+1**, **Emprestar**, **Devolver**, **Acabou**, **Editar**

```
+1          prateleira +1
Emprestar   prateleira -1   emprestado +1
Devolver    prateleira +1   emprestado -1
Acabou      prateleira -1
```

**Acabou** não apaga o produto. Ele fica no catálogo. Na próxima leitura, só soma de novo.
