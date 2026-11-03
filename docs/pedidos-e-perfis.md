# Pedidos, recebimento e perfis

O fluxo de compras está disponível em `/pedidos`.

```text
Pedido com um ou mais produtos → técnicos avisados → cadastro por produto → entregas parciais → estoque atualizado → pedido concluído quando todos os produtos chegarem
```

## Perfis

| Perfil | Pedido | Cadastro | Recebimento | Gerir usuários | Apagar dados operacionais |
|---|---:|---:|---:|---:|---:|
| Aluno | Sim | Não | Sim | Não | Não |
| Técnico | Sim | Sim | Sim | Não | Não |
| Gerente | Sim | Não | Sim | Sim | Não |
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
3. Todos os técnicos veem todos os produtos ainda sem registro de compra e o
   contador vermelho ao lado do perfil Técnico mostra quantos estão abertos.
   O pedido indica a categoria de cada produto: reagente química, células,
   escritório, informática, kits de biologia molecular, consumíveis de
   laboratório, equipamentos, biossegurança/EPI ou outros. Um técnico clica
   em **Assumir compra** para se responsabilizar
   por um produto; outro técnico não consegue assumir ou registrar esse mesmo
   produto. O técnico responsável registra fornecedor e demais dados. O
   desenvolvedor pode fazer o registro como administrador.
4. O recebimento fica disponível depois do registro de compra. Aluno, técnico,
   gerente ou desenvolvedor pode registrar cada entrega de um produto.
   A quantidade efetivamente recebida entra no estoque. O pedido fica
   `PARCIAL` enquanto faltar qualquer produto e passa a `DISPONIVEL` quando
   todos atingirem a quantidade solicitada.
5. Se a soma recebida ultrapassar a quantidade solicitada, o recebedor precisa
   informar uma observação. A entrega registra o excedente e o campo
   `alerta_tecnico_pendente`. O envio do alerta será implementado depois.
6. Se não for informado código de barras no recebimento, o sistema gera um
   código interno `REQ-...`. Ele pode ser vinculado a um código de barras depois.

## Limitação desta fase

O seletor de usuário permite testar os perfis, mas **não é autenticação**: uma
pessoa no mesmo navegador pode selecionar outro nome. Antes de disponibilizar
o sistema fora da rede, esta tela deve usar login real, senha ou um provedor de
identidade para que as permissões tenham segurança efetiva.
