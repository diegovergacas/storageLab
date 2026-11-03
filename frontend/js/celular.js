import { api } from "./api.js";
import { opcoesCategoria, nomeCategoria } from "./categorias.js";
import { escapeHtml, tela } from "./html.js";

const permissoes = {
  DESENVOLVEDOR: ["pedir", "cadastrar", "receber"],
  GERENTE: ["pedir", "receber"],
  TECNICO: ["pedir", "cadastrar", "receber"],
  ALUNO: ["pedir", "receber"],
};

let usuarios = [];
let solicitacoes = [];
let usuarioId = "";
let telaAtual = "inicio";
let pedidoSelecionado = "";
let itemSelecionado = "";
let itensRascunho = [];
let totalPendencias = 0;

function usuarioAtual() { return usuarios.find((usuario) => usuario.id === usuarioId); }
function pode(acao) { return permissoes[usuarioAtual()?.perfil]?.includes(acao); }
function perfilBotao(perfil) { return `<button class="perfil-btn ${usuarioAtual()?.perfil === perfil ? "ativo" : ""}" data-perfil="${perfil}">${perfil[0] + perfil.slice(1).toLowerCase()}${perfil === "TECNICO" && totalPendencias ? ` <span class="badge-pendencias">${totalPendencias}</span>` : ""}</button>`; }

function montar() {
  const usuario = usuarioAtual();
  const conteudo = telaAtual === "pedido" ? telaPedido() : telaAtual === "recebimento" ? telaRecebimento() : telaAtual === "cadastro" ? telaCadastro() : telaAtual === "confirmar-recebimento" ? telaConfirmarRecebimento() : telaInicio();
  tela(`
    <section class="mobile-card">
      <p class="kicker">Perfil temporário de desenvolvimento</p>
      <div class="perfis-mobile">${["ALUNO", "TECNICO", "GERENTE", "DESENVOLVEDOR"].map(perfilBotao).join("")}</div>
      ${usuario?.perfil === "TECNICO" ? `<label for="seletor-tecnico-mobile">Operador técnico</label><select id="seletor-tecnico-mobile">${usuarios.filter((item) => item.perfil === "TECNICO").map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === usuarioId ? "selected" : ""}>${escapeHtml(item.nome)}</option>`).join("")}</select><p class="meta">${totalPendencias} produto(s) aguardando registro de compra.</p>` : ""}
      <p class="meta">Usando como: <strong>${escapeHtml(usuario?.nome || "")}</strong></p>
      <div id="avisos-mobile"></div>
    </section>
    ${conteudo}
  `);
  document.querySelectorAll("[data-perfil]").forEach((botao) => { botao.onclick = () => trocarPerfil(botao.dataset.perfil); });
  document.querySelector("#seletor-tecnico-mobile")?.addEventListener("change", (evento) => { usuarioId = evento.target.value; atualizar().catch((erro) => mostrarErro(erro.message)); });
  document.querySelector("#ir-pedido")?.addEventListener("click", () => navegar("pedido"));
  document.querySelector("#ir-recebimento")?.addEventListener("click", () => navegar("recebimento"));
  document.querySelector("#voltar-inicio")?.addEventListener("click", () => navegar("inicio"));
  document.querySelector("#enviar-pedido")?.addEventListener("click", enviarPedido);
  document.querySelector("#adicionar-produto-mobile")?.addEventListener("click", adicionarProduto);
  document.querySelector("#lista-rascunho")?.addEventListener("click", (evento) => {
    const indice = Number(evento.target.dataset.remover);
    if (!Number.isInteger(indice) || !evento.target.hasAttribute("data-remover")) return;
    const campos = ["nome-pedido", "quantidade-pedido", "unidade-pedido", "categoria-pedido", "previsao-pedido", "verba-pedido", "obs-pedido"];
    const valores = Object.fromEntries(campos.map((id) => [id, document.getElementById(id).value]));
    itensRascunho.splice(indice, 1);
    montar();
    for (const [id, valor] of Object.entries(valores)) document.getElementById(id).value = valor;
  });
  document.querySelector("#form-cadastro-mobile")?.addEventListener("submit", salvarCadastro);
  document.querySelector("#form-recebimento-mobile")?.addEventListener("submit", salvarRecebimento);
  document.querySelector("#cancelar-operacao")?.addEventListener("click", () => navegar("recebimento"));
  if (telaAtual === "recebimento") desenharPedidos();
}

function telaInicio() {
  const gestao = usuarioAtual()?.perfil === "ALUNO" ? "" : '<a class="btn btn-ghost" href="/gestao">Abrir gestão do estoque</a>';
  return `<section class="mobile-card menu-mobile"><p class="kicker">O que deseja fazer?</p><button class="btn btn-primary" id="ir-pedido">Fazer pedido</button><button class="btn btn-ghost" id="ir-recebimento">Receber produtos</button>${gestao}</section>`;
}

function telaPedido() {
  return `<section class="mobile-card"><p class="kicker">Novo pedido</p><div id="lista-rascunho">${itensRascunho.map((item, indice) => `<p>${escapeHtml(item.nome)} · ${item.quantidade} ${escapeHtml(item.unidade)} · ${escapeHtml(nomeCategoria(item.categoria_compra))} <button type="button" class="acao-pedido" data-remover="${indice}">Remover</button></p>`).join("")}</div><label for="nome-pedido">Reagente / material</label><input id="nome-pedido" /><label for="quantidade-pedido">Quantidade</label><input id="quantidade-pedido" type="number" min="1" value="1" /><label for="unidade-pedido">Unidade</label><input id="unidade-pedido" value="frasco" /><label for="categoria-pedido">Categoria do produto</label><select id="categoria-pedido">${opcoesCategoria()}</select><button class="btn btn-ghost" id="adicionar-produto-mobile">Adicionar produto</button><label for="previsao-pedido">Previsão</label><input id="previsao-pedido" type="date" /><label for="verba-pedido">Verba</label><input id="verba-pedido" /><label for="obs-pedido">Observação</label><input id="obs-pedido" /><button class="btn btn-primary" id="enviar-pedido">Enviar pedido</button><button class="btn btn-ghost" id="voltar-inicio">Voltar</button></section>`;
}

function telaRecebimento() {
  return `<section class="mobile-card"><p class="kicker">Recebimento</p><p class="meta">Selecione um pedido para cadastrar os dados ou registrar sua chegada.</p><div id="lista-pedidos-mobile"></div><button class="btn btn-ghost" id="voltar-inicio">Voltar</button></section>`;
}

function telaCadastro() {
  const pedido = solicitacoes.find((item) => item.id === pedidoSelecionado);
  const item = pedido?.itens.find((valor) => valor.id === itemSelecionado);
  if (!item || !pode("cadastrar")) return telaRecebimento();
  return `<section class="mobile-card"><p class="kicker">Registrar compra</p><h2>${escapeHtml(item.nome)}</h2><form id="form-cadastro-mobile"><label>Marca / empresa<input name="marca" value="${escapeHtml(item.marca || "")}" required /></label><label>Código do fornecedor<input name="codigo_fornecedor" value="${escapeHtml(item.codigo_fornecedor || "")}" /></label><label>Data da compra<input name="data_compra" type="date" value="${escapeHtml(item.data_compra || "")}" required /></label><label>Valor<input name="valor" value="${escapeHtml(item.valor || "")}" /></label><label>Local / sala<input name="local_sala" value="${escapeHtml(item.local_sala || "")}" /></label><label>Armário, freezer ou geladeira<input name="local_armazenamento" value="${escapeHtml(item.local_armazenamento || "")}" /></label><button class="btn btn-primary" type="submit">Salvar compra</button></form><button class="btn btn-ghost" id="cancelar-operacao">Cancelar</button></section>`;
}

function telaConfirmarRecebimento() {
  const pedido = solicitacoes.find((item) => item.id === pedidoSelecionado);
  const item = pedido?.itens.find((valor) => valor.id === itemSelecionado);
  if (!item || !pode("receber")) return telaRecebimento();
  return `<section class="mobile-card"><p class="kicker">Registrar recebimento</p><h2>${escapeHtml(item.nome)}</h2><p class="meta">Faltam ${Math.max(0, item.quantidade - (item.quantidade_recebida || 0))} ${escapeHtml(item.unidade)}</p><form id="form-recebimento-mobile"><label>Quantidade recebida<input name="quantidade_recebida" type="number" min="1" value="${Math.max(1, item.quantidade - (item.quantidade_recebida || 0))}" required /></label><label>Data da entrega<input name="data_entrega" type="date" value="${new Date().toLocaleDateString("en-CA")}" required /></label><label>Código de barras (opcional)<input name="codigo" value="${escapeHtml(item.codigo || "")}" /></label><label>Observação da entrega<input name="observacao" /></label><p class="meta">Se chegar mais que o solicitado, a observação é obrigatória.</p><button class="btn btn-primary" type="submit">Confirmar recebimento</button></form><button class="btn btn-ghost" id="cancelar-operacao">Cancelar</button></section>`;
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
  const tecnicoContador = usuario.perfil === "TECNICO" ? usuario : usuarios.find((item) => item.perfil === "TECNICO");
  totalPendencias = tecnicoContador ? (await api(`/api/solicitacoes/pendencias-tecnico?usuario_id=${encodeURIComponent(tecnicoContador.id)}`)).total : 0;
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
    return `<article class="pedido-mobile"><strong>Pedido por ${escapeHtml(pedido.solicitante)}</strong><small>${escapeHtml(pedido.status)}</small>${pedido.itens.map((item) => {
      const recebido = Number(item.quantidade_recebida || 0);
      const falta = Math.max(0, item.quantidade - recebido);
      const entregas = (item.entregas || []).map((e) => `<small>${e.quantidade} em ${escapeHtml(e.data_entrega)}${e.excedente ? ` · ${e.excedente} excedentes · ${escapeHtml(e.observacao)}` : ""}</small>`).join("");
      const proprio = item.tecnico_responsavel_id === usuarioId;
      const assumir = usuarioAtual()?.perfil === "TECNICO" && falta && !item.cadastrado && !item.tecnico_responsavel_id;
      const cadastrar = falta && pode("cadastrar") && (proprio || usuarioAtual()?.perfil === "DESENVOLVEDOR");
      return `<div class="produto-mobile"><strong>${escapeHtml(item.nome)}</strong><span>Categoria: ${escapeHtml(nomeCategoria(item.categoria_compra))} · Compra: ${escapeHtml(item.tecnico_responsavel || "sem responsável")}${item.cadastrado ? " · registrada" : " · aguardando registro"}</span><span>${item.quantidade} pedidos · ${recebido} recebidos · ${falta} pendentes</span>${entregas}<div>${assumir ? `<button class="acao-pedido" data-assumir="${escapeHtml(pedido.id)}" data-item="${escapeHtml(item.id)}">Assumir compra</button>` : ""}${cadastrar ? `<button class="acao-pedido" data-cadastro="${escapeHtml(pedido.id)}" data-item="${escapeHtml(item.id)}">Registrar compra</button>` : ""}${falta && pode("receber") && item.cadastrado ? `<button class="acao-pedido" data-receber="${escapeHtml(pedido.id)}" data-item="${escapeHtml(item.id)}">Receber</button>` : ""}</div></div>`;
    }).join("")}</article>`;
  }).join("") || "<p class='meta'>Não há produtos aguardando recebimento.</p>";
  destino.onclick = agirPedido;
}

function lerProduto() {
  const nome = document.querySelector("#nome-pedido").value.trim();
  const quantidade = Number(document.querySelector("#quantidade-pedido").value);
  const unidade = document.querySelector("#unidade-pedido").value.trim();
  const categoria_compra = document.querySelector("#categoria-pedido").value;
  return nome && Number.isInteger(quantidade) && quantidade > 0 && unidade ? { nome, quantidade, unidade, categoria_compra } : null;
}

function adicionarProduto() {
  const produto = lerProduto();
  if (!produto) return mostrarErro("Informe nome, quantidade e unidade do produto.");
  itensRascunho.push(produto);
  document.querySelector("#nome-pedido").value = "";
  document.querySelector("#quantidade-pedido").value = 1;
  document.querySelector("#lista-rascunho").innerHTML = itensRascunho.map((item, indice) => `<p>${escapeHtml(item.nome)} · ${item.quantidade} ${escapeHtml(item.unidade)} · ${escapeHtml(nomeCategoria(item.categoria_compra))} <button type="button" class="acao-pedido" data-remover="${indice}">Remover</button></p>`).join("");
}

async function enviarPedido() {
  const digitado = document.querySelector("#nome-pedido").value.trim() ? lerProduto() : null;
  if (document.querySelector("#nome-pedido").value.trim() && !digitado) return mostrarErro("Confira o produto digitado.");
  const itens = [...itensRascunho, ...(digitado ? [digitado] : [])];
  if (!itens.length) return mostrarErro("Adicione pelo menos um produto.");
  try {
    await api("/api/solicitacoes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({usuario_id:usuarioId, itens, previsao:document.querySelector("#previsao-pedido").value, verba:document.querySelector("#verba-pedido").value, observacao:document.querySelector("#obs-pedido").value}) });
    itensRascunho = [];
    telaAtual = "inicio";
    await atualizar();
  } catch (erro) { alert(erro.message); }
}

async function agirPedido(evento) {
  const assumir = evento.target.dataset.assumir;
  const cadastro = evento.target.dataset.cadastro;
  const receber = evento.target.dataset.receber;
  if (!assumir && !cadastro && !receber) return;
  const pedido = solicitacoes.find((item) => item.id === (assumir || cadastro || receber));
  const item = pedido?.itens.find((valor) => valor.id === evento.target.dataset.item);
  if (!item || item.quantidade_recebida >= item.quantidade) return;
  if (assumir) {
    if (usuarioAtual()?.perfil !== "TECNICO") return;
    try {
      await api(`/api/solicitacoes/${encodeURIComponent(pedido.id)}/assumir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario_id: usuarioId, item_id: item.id }) });
      await atualizar();
    } catch (erro) { mostrarErro(erro.message); }
    return;
  }
  if (cadastro && !pode("cadastrar")) return;
  if (cadastro && usuarioAtual()?.perfil !== "DESENVOLVEDOR" && item.tecnico_responsavel_id !== usuarioId) return;
  if (receber && !pode("receber")) return;
  pedidoSelecionado = pedido.id;
  itemSelecionado = item.id;
  navegar(cadastro ? "cadastro" : "confirmar-recebimento");
}

async function salvarCadastro(evento) {
  evento.preventDefault();
  if (!pode("cadastrar") || !pedidoSelecionado) return;
  const dados = Object.fromEntries(new FormData(evento.target));
  try {
    await api(`/api/solicitacoes/${encodeURIComponent(pedidoSelecionado)}/cadastro`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_id:usuarioId,item_id:itemSelecionado,...dados})});
    pedidoSelecionado = ""; telaAtual = "recebimento"; await atualizar();
  } catch (erro) { mostrarErro(erro.message); }
}

async function salvarRecebimento(evento) {
  evento.preventDefault();
  if (!pode("receber") || !pedidoSelecionado) return;
  const dados = Object.fromEntries(new FormData(evento.target));
  const quantidade_recebida = Number(dados.quantidade_recebida);
  if (!Number.isInteger(quantidade_recebida) || quantidade_recebida < 1) return;
  try {
    await api(`/api/solicitacoes/${encodeURIComponent(pedidoSelecionado)}/receber`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_id:usuarioId,item_id:itemSelecionado,quantidade_recebida,codigo:dados.codigo,observacao:dados.observacao,data_entrega:dados.data_entrega})});
    pedidoSelecionado = ""; telaAtual = "recebimento"; await atualizar();
  } catch (erro) { mostrarErro(erro.message); }
}

function mostrarErro(texto) {
  let aviso = document.querySelector("#erro-operacao");
  if (!aviso) { aviso = document.createElement("p"); aviso.id = "erro-operacao"; aviso.setAttribute("role", "alert"); document.querySelector(".mobile-card:last-child")?.prepend(aviso); }
  aviso.textContent = texto;
}

carregar().catch((erro) => tela(`<p class="meta">${escapeHtml(erro.message)}</p>`));
