import { api } from "./api.js";
import { escapeHtml, tela } from "./html.js";

const permissoes = {
  DESENVOLVEDOR: ["pedir", "cadastrar", "receber"],
  GERENTE: ["pedir", "cadastrar", "receber"],
  TECNICO: ["pedir", "cadastrar", "receber"],
  ALUNO: ["pedir", "receber"],
};

let usuarios = [];
let solicitacoes = [];
let usuarioId = "";
let telaAtual = "inicio";

function usuarioAtual() { return usuarios.find((usuario) => usuario.id === usuarioId); }
function pode(acao) { return permissoes[usuarioAtual()?.perfil]?.includes(acao); }
function perfilBotao(perfil) { return `<button class="perfil-btn ${usuarioAtual()?.perfil === perfil ? "ativo" : ""}" data-perfil="${perfil}">${perfil[0] + perfil.slice(1).toLowerCase()}</button>`; }

function montar() {
  const usuario = usuarioAtual();
  const conteudo = telaAtual === "pedido" ? telaPedido() : telaAtual === "recebimento" ? telaRecebimento() : telaInicio();
  tela(`
    <section class="mobile-card">
      <p class="kicker">Perfil temporário de desenvolvimento</p>
      <div class="perfis-mobile">${["ALUNO", "TECNICO", "GERENTE", "DESENVOLVEDOR"].map(perfilBotao).join("")}</div>
      <p class="meta">Usando como: <strong>${escapeHtml(usuario?.nome || "")}</strong></p>
      <div id="avisos-mobile"></div>
    </section>
    ${conteudo}
  `);
  document.querySelectorAll("[data-perfil]").forEach((botao) => { botao.onclick = () => trocarPerfil(botao.dataset.perfil); });
  document.querySelector("#ir-pedido")?.addEventListener("click", () => navegar("pedido"));
  document.querySelector("#ir-recebimento")?.addEventListener("click", () => navegar("recebimento"));
  document.querySelector("#voltar-inicio")?.addEventListener("click", () => navegar("inicio"));
  document.querySelector("#enviar-pedido")?.addEventListener("click", enviarPedido);
  if (telaAtual === "recebimento") desenharPedidos();
}

function telaInicio() {
  const gestao = usuarioAtual()?.perfil === "ALUNO" ? "" : '<a class="btn btn-ghost" href="/gestao">Abrir gestão do estoque</a>';
  return `<section class="mobile-card menu-mobile"><p class="kicker">O que deseja fazer?</p><button class="btn btn-primary" id="ir-pedido">Fazer pedido</button><button class="btn btn-ghost" id="ir-recebimento">Receber produtos</button>${gestao}</section>`;
}

function telaPedido() {
  return `<section class="mobile-card"><p class="kicker">Novo pedido</p><label for="nome-pedido">Insumo</label><input id="nome-pedido" required /><label for="quantidade-pedido">Quantidade</label><input id="quantidade-pedido" type="number" min="1" value="1" /><label for="unidade-pedido">Unidade</label><input id="unidade-pedido" value="frasco" /><label for="obs-pedido">Observação</label><input id="obs-pedido" /><button class="btn btn-primary" id="enviar-pedido">Enviar pedido</button><button class="btn btn-ghost" id="voltar-inicio">Voltar</button></section>`;
}

function telaRecebimento() {
  return `<section class="mobile-card"><p class="kicker">Recebimento</p><p class="meta">Selecione um pedido para cadastrar os dados ou registrar sua chegada.</p><div id="lista-pedidos-mobile"></div><button class="btn btn-ghost" id="voltar-inicio">Voltar</button></section>`;
}

async function carregar() {
  const resposta = await api("/api/usuarios");
  usuarios = resposta.usuarios;
  const salvo = localStorage.getItem("storagelab-usuario");
  usuarioId = usuarios.some((usuario) => usuario.id === salvo) ? salvo : usuarios.find((usuario) => usuario.perfil === "ALUNO")?.id;
  await atualizar();
}

async function atualizar() {
  localStorage.setItem("storagelab-usuario", usuarioId);
  const usuario = usuarioAtual();
  const [pedidos, avisos] = await Promise.all([
    api("/api/solicitacoes"),
    api(`/api/solicitacoes/notificacoes?usuario_id=${encodeURIComponent(usuario.id)}`),
  ]);
  solicitacoes = pedidos.solicitacoes;
  montar();
  const caixa = document.querySelector("#avisos-mobile");
  caixa.innerHTML = avisos.notificacoes.map((item) => `<p class="aviso-mobile">${escapeHtml(item.mensagem)}</p>`).join("");
}

async function trocarPerfil(perfil) {
  const usuario = usuarios.find((item) => item.perfil === perfil);
  if (!usuario) return;
  usuarioId = usuario.id;
  await atualizar();
}

function navegar(destino) {
  telaAtual = destino;
  montar();
  carregarAvisos();
}

async function carregarAvisos() {
  const usuario = usuarioAtual();
  const resposta = await api(`/api/solicitacoes/notificacoes?usuario_id=${encodeURIComponent(usuario.id)}`);
  const caixa = document.querySelector("#avisos-mobile");
  if (caixa) caixa.innerHTML = resposta.notificacoes.map((item) => `<p class="aviso-mobile">${escapeHtml(item.mensagem)}</p>`).join("");
}

function desenharPedidos() {
  const destino = document.querySelector("#lista-pedidos-mobile");
  const pendentes = solicitacoes.filter((pedido) => pedido.status !== "DISPONIVEL");
  destino.innerHTML = pendentes.map((pedido) => {
    const cadastro = pode("cadastrar") && pedido.status !== "DISPONIVEL" ? `<button class="acao-pedido" data-cadastro="${pedido.id}">Cadastrar</button>` : "";
    const receber = pode("receber") && pedido.status !== "DISPONIVEL" ? `<button class="acao-pedido" data-receber="${pedido.id}">Receber</button>` : "";
    return `<article class="pedido-mobile"><strong>${escapeHtml(pedido.nome)}</strong><span>${pedido.quantidade} ${escapeHtml(pedido.unidade)} · ${escapeHtml(pedido.status)}</span><small>Pedido por ${escapeHtml(pedido.solicitante)}</small>${pedido.status === "DISPONIVEL" ? `<small>Disponível: ${escapeHtml(pedido.item_codigo)}</small>` : ""}<div>${cadastro}${receber}</div></article>`;
  }).join("") || "<p class='meta'>Não há produtos aguardando recebimento.</p>";
  destino.onclick = agirPedido;
}

async function enviarPedido() {
  const nome = document.querySelector("#nome-pedido").value.trim();
  const quantidade = Number(document.querySelector("#quantidade-pedido").value);
  if (!nome || !Number.isInteger(quantidade) || quantidade < 1) return;
  try {
    await api("/api/solicitacoes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({usuario_id:usuarioId, nome, quantidade, unidade:document.querySelector("#unidade-pedido").value, observacao:document.querySelector("#obs-pedido").value}) });
    telaAtual = "inicio";
    await atualizar();
  } catch (erro) { alert(erro.message); }
}

async function agirPedido(evento) {
  const cadastro = evento.target.dataset.cadastro;
  const receber = evento.target.dataset.receber;
  if (!cadastro && !receber) return;
  const pedido = solicitacoes.find((item) => item.id === (cadastro || receber));
  try {
    if (cadastro) {
      const marca = prompt("Marca/empresa:", pedido.marca || ""); if (marca === null) return;
      const codigo_fornecedor = prompt("Código do fornecedor:", pedido.codigo_fornecedor || ""); if (codigo_fornecedor === null) return;
      const local_sala = prompt("Local/sala:", pedido.local_sala || ""); if (local_sala === null) return;
      const local_armazenamento = prompt("Local de armazenamento:", pedido.local_armazenamento || ""); if (local_armazenamento === null) return;
      await api(`/api/solicitacoes/${cadastro}/cadastro`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_id:usuarioId,marca,codigo_fornecedor,local_sala,local_armazenamento})});
    }
    if (receber) {
      const quantidade_recebida = Number(prompt("Quantidade recebida:", pedido.quantidade)); if (!Number.isInteger(quantidade_recebida) || quantidade_recebida < 1) return;
      const codigo = prompt("Código de barras (opcional):", ""); if (codigo === null) return;
      await api(`/api/solicitacoes/${receber}/receber`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_id:usuarioId,quantidade_recebida,codigo})});
    }
    await atualizar();
  } catch (erro) { alert(erro.message); }
}

carregar().catch((erro) => tela(`<p class="meta">${escapeHtml(erro.message)}</p>`));
