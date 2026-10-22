# Pedidos, recebimento e perfis

O fluxo de compras está disponível em `/pedidos`.

```text
Pedido → técnicos avisados → cadastro técnico → recebimento → estoque disponível → solicitante avisado
```

## Perfis

| Perfil | Pedido | Cadastro | Recebimento | Gerir usuários | Apagar dados operacionais |
|---|---:|---:|---:|---:|---:|
| Aluno | Sim | Não | Sim | Não | Não |
| Técnico | Sim | Sim | Sim | Não | Não |
| Gerente | Sim | Sim | Sim | Sim | Não |
| Desenvolvedor | Sim | Sim | Sim | Sim | Sim |

- Para desenvolvimento, os quatro perfis genéricos (Aluno, Técnico, Gerente e
  Desenvolvedor) são criados inicialmente.
- O gerente pode criar e editar usuários, mas não criar, editar ou alterar um
  usuário Desenvolvedor.
- O desenvolvedor pode apagar catálogo, posições de estoque e pedidos criados
  no sistema. A ação exige confirmação na tela.

## Como usar

1. Na tela `/pedidos`, escolha o usuário no seletor superior.
2. Qualquer perfil pode enviar um pedido. Todos os técnicos recebem o aviso.
3. Técnico, gerente ou desenvolvedor pode completar fornecedor e local de
   armazenamento em **Cadastrar dados**.
4. Aluno, técnico, gerente ou desenvolvedor pode registrar o recebimento. A
   quantidade entra no estoque e o solicitante recebe um aviso.
5. Se não for informado código de barras no recebimento, o sistema gera um
   código interno `REQ-...`. Ele pode ser vinculado a um código de barras depois.

## Limitação desta fase

O seletor de usuário permite testar os perfis, mas **não é autenticação**: uma
pessoa no mesmo navegador pode selecionar outro nome. Antes de disponibilizar
o sistema fora da rede, esta tela deve usar login real, senha ou um provedor de
identidade para que as permissões tenham segurança efetiva.
