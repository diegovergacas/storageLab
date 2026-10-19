# StorageLab

Aplicação local para controle do estoque de laboratório. O computador do laboratório executa o servidor e pode ser acessado pelo próprio PC e por celulares na mesma rede Wi-Fi.

## Estrutura da aplicação

![Árvore da aplicação](images/arvore-aplicacao.svg)

```text
estoque/
├── backend/
│   ├── api/                 rotas HTTP e validação dos dados
│   ├── dominio/             regras de itens, códigos e rótulos
│   ├── persistencia/        importação da planilha e arquivos JSON
│   ├── servicos/            OCR do rótulo com Tesseract
│   ├── main.py              aplicação FastAPI
│   └── __main__.py          inicialização do servidor HTTPS
├── frontend/
│   ├── css/                 estilos das telas
│   ├── js/                  leitura, cadastro, gestão e API
│   ├── index.html           tela do operador no celular
│   └── gestao.html          painel de gestão no computador
├── dados/
│   ├── catalogo.json        catálogo permanente de produtos
│   ├── estoque.json         prateleira e itens emprestados
│   ├── pedidos.json         cópia dos pedidos importados
│   ├── fotos/               fotos de rótulos
│   └── certs/               certificado HTTPS local
├── docs/                    documentação do projeto
├── LISTA INSUMOS LAB PESQ.xlsx  planilha usada na importação
├── requirements.txt         dependências Python
└── LICENSE
```

## Fluxo do operador no celular

![Fluxo do operador no celular](images/fluxo-celular.svg)

```mermaid
flowchart TD
    A[Abrir o StorageLab no celular] --> B{Ler ou digitar código}
    B --> C{Código existe no catálogo?}
    C -->|Sim| D[Mostrar cadastro, localização e estoque]
    D --> E[Informar quantidade recebida]
    E --> F[Confirmar entrada]
    D --> G[Editar dados, se necessário]
    D --> H[Registrar que acabou]
    C -->|Não| I{Produto está na lista de compras?}
    I -->|Sim| J[Selecionar produto e preencher formulário]
    J --> K[Revisar ou atualizar os campos]
    K --> L[Vincular código lido e salvar]
    I -->|Não| M{Como cadastrar?}
    M -->|Cadastrar na mão| N[Preencher formulário completo]
    M -->|Foto do rótulo| O[Capturar foto e receber sugestão OCR]
    O --> N
    N --> P[Salvar novo produto]
```

## Fluxo de gestão no computador

![Fluxo de gestão no computador](images/fluxo-computador.svg)

```mermaid
flowchart TD
    A[Abrir /gestao] --> B{Escolher uma ação}
    B --> C[Buscar ou ordenar a tabela]
    B --> D[Atualizar da planilha]
    D --> E[Importar dados da aba Compras]
    E --> F[Classificar valores em R$ ou US$]
    B --> G[Cadastrar na mão]
    B --> H[Clicar no nome ou em Editar]
    G --> I[Preencher formulário completo]
    H --> I
    I --> J[Salvar alterações]
    B --> K[Movimentar estoque]
    K --> L[Entrada: somar quantidade à prateleira]
    K --> M[Emprestar ou devolver]
    K --> N[Acabou: baixar uma unidade]
```

## Documentação detalhada

| Documento | Conteúdo |
|---|---|
| [o-que-a-aplicacao-faz.md](o-que-a-aplicacao-faz.md) | Regras de negócio e funcionalidades atuais |
| [uso.md](uso.md) | Como iniciar e utilizar o sistema |
| [arquitetura.md](arquitetura.md) | Camadas, dados e APIs |
