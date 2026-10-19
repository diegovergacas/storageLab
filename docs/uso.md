# Uso

## Iniciar o servidor

No computador do laboratório, abra um terminal:

```bash
cd /home/vergacas/Documentos/estoque
source .venv/bin/activate
python -m backend
```

O servidor inicia em HTTPS na porta `8000`. Deixe o terminal aberto enquanto o sistema estiver em uso.

Para descobrir o endereço do computador na rede:

```bash
hostname -I
```

No celular, abra `https://IP_DO_COMPUTADOR:8000`. Use um endereço iniciado por `192.168.` e aceite o aviso do certificado local no primeiro acesso.

## Celular

1. Abra a página inicial do StorageLab.
2. Toque em **Ler código** ou **Digitar código**.
3. Quando o produto já existir, confira os dados, informe a quantidade recebida e confirme a entrada. Use **Editar dados** se algo precisar ser corrigido.
4. Quando o código não existir, escolha **Cadastrar na mão** ou **Cadastrar com foto do rótulo**.
5. Se o produto aparecer na lista de compras, selecione-o. Os campos são preenchidos automaticamente; revise, altere o necessário e salve.

## Gestão no computador

Abra `https://127.0.0.1:8000/gestao` no navegador do PC.

- Clique no nome de um item ou em **Editar** para abrir o cadastro preenchido.
- Use **Cadastrar na mão** para criar um item novo.
- Use **Atualizar da planilha** depois de substituir ou editar `LISTA INSUMOS LAB PESQ.xlsx`.
- Clique nos títulos das colunas para ordenar. Um segundo clique inverte a ordem.
- Use os botões de colunas ou a barra de rolagem horizontal para navegar lateralmente.

## Atualizar a planilha

O sistema importa a aba `Compras` da planilha `LISTA INSUMOS LAB PESQ.xlsx`. Os campos usados são:

`Solicitante`, `Reagente/Material`, `Código`, `Quantidade`, `Unidade`, `Empresa`, `Data`, `Valor`, `Previsão`, `Verba`, `Entregue`, `Data da entrega`, `Local Sala` e `Local armário/Freezer/Geladeira`.

Após atualizar a planilha no arquivo, abra `/gestao` e clique em **Atualizar da planilha**. Valores em dólar precisam começar com `US$`, `U$` ou `USD`; os demais serão tratados como reais.
