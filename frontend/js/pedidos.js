import { api } from "./api.js";
import { opcoesCategoria, nomeCategoria } from "./categorias.js";

const botoesPerfil = [...document.querySelectorAll("[data-perfil]")];
const perfil = document.querySelector("#perfil");
const avisos = document.querySelector("#avisos");
const lista = document.querySelector("#lista");
const mensagem = document.querySelector("#mensagem");
const usuariosCard = document.querySelector("#usuarios-card");
const dadosCard = document.querySelector("#dados-card");
let usuarios = [];
let solicitacoes = [];
let usuarioId = "";
let pedidoEmEdicao = "";
let pedidoEmRecebimento = "";
const cadastroCard = document.querySelector("#cadastro-card");
const recebimentoCard = document.querySelector("#recebimento-card");
const seletorTecnico = document.querySelector("#seletor-tecnico");

const permissoes = {
  DESENVOLVEDOR: ["pedir", "cadastrar", "receber", "gerir_usuarios", "apagar_dados"],
  GERENTE: ["pedir", "receber", "gerir_usuarios"],
  TECNICO: ["pedir", "cadastrar", "receber"],
  ALUNO: ["pedir", "receber"],
};

function escapar(valor) { return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function atual() { return usuarios.find((usuario) => usuario.id === usuarioId); }
function pode(acao) { return permissoes[atual()?.perfil]?.includes(acao); }
function aviso(texto, erro = false) { mensagem.textContent = texto || ""; mensagem.style.color = erro ? "#9d3f1c" : "#2f6b45"; }

const itensNovoPedido = document.querySelector("#itens-novo-pedido");
function adicionarItem() {
  const linha = document.createElement("div");
  linha.className = "item-novo";
  linha.innerHTML = `<label>Reagente / material<input name="nome" required /></label><label>Quantidade<input name="quantidade" type="number" min="1" value="1" required /></label><label>Unidade<input name="unidade" value="frasco" required /></label><label>Categoria do produto<select name="categoria_compra">${opcoesCategoria()}</select></label><button type="button" class="remover-item secundario">Remover produto</button>`;
  itensNovoPedido.append(linha);
}
document.querySelector("#adicionar-item").onclick = adicionarItem;
itensNovoPedido.onclick = (evento) => {
  if (evento.target.classList.contains("remover-item") && itensNovoPedido.children.length > 1) evento.target.closest(".item-novo").remove();
};
adicionarItem();

async function carregar() {
  const dados = await api("/api/usuarios");
  usuarios = dados.usuarios;
  const salvo = localStorage.getItem("storagelab-usuario");
  usuarioId = usuarios.some((usuario) => usuario.id === salvo) ? salvo : usuarios.find((usuario) => usuario.perfil === "ALUNO")?.id || usuarios[0]?.id;
  seletorTecnico.innerHTML = usuarios.filter((usuario) => usuario.perfil === "TECNICO").map((usuario) => `<option value="${escapar(usuario.id)}">${escapar(usuario.nome)}</option>`).join("");
  marcarPerfil();
  await atualizar();
}

async function atualizar() {
  const usuario = atual();
  if (!usuario) return;
  localStorage.setItem("storagelab-usuario", usuario.id);
  perfil.textContent = `Perfil atual: ${usuario.perfil}`;
  document.querySelector("#seletor-tecnico-label").hidden = usuario.perfil !== "TECNICO";
  if (usuario.perfil === "TECNICO") seletorTecnico.value = usuario.id;
  usuariosCard.hidden = !pode("gerir_usuarios");
  dadosCard.hidden = !pode("apagar_dados");
  const [pedidos, notificacoes] = await Promise.all([api("/api/solicitacoes"), api(`/api/solicitacoes/notificacoes?usuario_id=${encodeURIComponent(usuario.id)}`)]);
  solicitacoes = pedidos.solicitacoes;
  const tecnicoContador = usuario.perfil === "TECNICO" ? usuario : usuarios.find((item) => item.perfil === "TECNICO");
  const pendencias = tecnicoContador ? await api(`/api/solicitacoes/pendencias-tecnico?usuario_id=${encodeURIComponent(tecnicoContador.id)}`) : { total: 0 };
  const badge = document.querySelector("#badge-tecnico");
  badge.textContent = pendencias.total;
  badge.hidden = pendencias.total === 0;
  document.querySelector("#resumo-pendencias").textContent = usuario.perfil === "TECNICO" ? `${pendencias.total} produto(s) aguardando registro de compra. Escolha os da sua área.` : "";
  avisos.innerHTML = (notificacoes.notificacoes || []).map((item) => `<p class="aviso">${escapar(item.mensagem)}</p>`).join("") || "";
  desenharPedidos();
  desenharUsuarios();
}

function marcarPerfil() {
  const perfilAtual = atual()?.perfil;
  botoesPerfil.forEach((botao) => botao.classList.toggle("ativo", botao.dataset.perfil === perfilAtual));
}

function desenharPedidos() {
  lista.innerHTML = solicitacoes.map((pedido) => {
    const itens = pedido.itens.map((item) => {
      const recebido = Number(item.quantidade_recebida || 0);
      const pendente = Math.max(0, item.quantidade - recebido);
      const entregas = (item.entregas || []).map((e) => `<li>${e.quantidade} ${escapar(item.unidade)} em ${escapar(e.data_entrega)} por ${escapar(e.recebido_por)}${e.excedente ? ` · excedente: ${e.excedente} · observação: ${escapar(e.observacao)}` : ""}</li>`).join("");
      const responsavel = item.tecnico_responsavel_id;
      const proprio = responsavel === usuarioId;
      const assumir = atual()?.perfil === "TECNICO" && !item.cadastrado && !responsavel;
      const cadastrar = pode("cadastrar") && pendente && (proprio || atual()?.perfil === "DESENVOLVEDOR");
      return `<div class="pedido-item"><strong>${escapar(item.nome)}</strong><p>Categoria: ${escapar(nomeCategoria(item.categoria_compra))} · Compra: ${escapar(item.tecnico_responsavel || "sem responsável")}${item.cadastrado ? " · registrada" : " · aguardando registro"}</p><p>${item.quantidade} ${escapar(item.unidade)} solicitados · ${recebido} recebidos · ${pendente} pendentes${recebido > item.quantidade ? ` · ${recebido - item.quantidade} excedentes` : ""}</p>${entregas ? `<ul>${entregas}</ul>` : ""}<div class="acoes">${assumir ? `<button data-assumir="${escapar(pedido.id)}" data-item="${escapar(item.id)}">Assumir compra</button>` : ""}${cadastrar ? `<button data-cadastro="${escapar(pedido.id)}" data-item="${escapar(item.id)}">Registrar compra</button>` : ""}${pode("receber") && pendente && item.cadastrado ? `<button data-receber="${escapar(pedido.id)}" data-item="${escapar(item.id)}">Registrar recebimento</button>` : ""}</div></div>`;
    }).join("");
    return `<article class="pedido"><h3>Pedido de ${escapar(pedido.solicitante)}</h3><p><span class="status">${escapar(pedido.status)}</span></p><p class="muted">${escapar(pedido.observacao || "Sem observação")}</p>${itens}</article>`;
  }).join("") || "<p class='muted'>Nenhum pedido criado.</p>";
}

function desenharUsuarios() {
  if (!pode("gerir_usuarios")) return;
  const alvo = document.querySelector("#lista-usuarios");
  alvo.innerHTML = usuarios.map((usuario) => {
    const bloqueado = atual().perfil !== "DESENVOLVEDOR" && usuario.perfil === "DESENVOLVEDOR";
    return `<div class="usuario-linha"><input data-nome="${escapar(usuario.id)}" value="${escapar(usuario.nome)}" ${bloqueado ? "disabled" : ""}/><select data-perfil="${escapar(usuario.id)}" ${bloqueado ? "disabled" : ""}>${["ALUNO","TECNICO","GERENTE","DESENVOLVEDOR"].map((tipo) => `<option ${usuario.perfil === tipo ? "selected" : ""}>${tipo}</option>`).join("")}</select><button data-salvar-usuario="${escapar(usuario.id)}" ${bloqueado ? "disabled" : ""}>Salvar</button></div>`;
  }).join("");
}

document.querySelector("#novo-pedido").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    const itens = [...itensNovoPedido.querySelectorAll(".item-novo")].map((linha) => ({ nome: linha.querySelector('[name="nome"]').value.trim(), quantidade: Number(linha.querySelector('[name="quantidade"]').value), unidade: linha.querySelector('[name="unidade"]').value.trim(), categoria_compra: linha.querySelector('[name="categoria_compra"]').value }));
    await api("/api/solicitacoes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ usuario_id:atual().id, itens, previsao:document.querySelector("#pedido-previsao").value, verba:document.querySelector("#pedido-verba").value, observacao:document.querySelector("#pedido-observacao").value }) });
    evento.target.reset(); itensNovoPedido.replaceChildren(); adicionarItem();
    aviso("Pedido enviado. Os técnicos foram avisados."); await atualizar();
  } catch (erro) { aviso(erro.message, true); }
});

lista.addEventListener("click", async (evento) => {
  const cadastro = evento.target.dataset.cadastro;
  const assumir = evento.target.dataset.assumir;
  const receber = evento.target.dataset.receber;
  const itemId = evento.target.dataset.item;
  if (assumir && atual()?.perfil === "TECNICO") {
    try {
      await api(`/api/solicitacoes/${encodeURIComponent(assumir)}/assumir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario_id: usuarioId, item_id: itemId }) });
      aviso("Produto atribuído a você. Agora registre a compra.");
      await atualizar();
    } catch (erro) { aviso(erro.message, true); }
    return;
  }
  if (cadastro && pode("cadastrar")) {
    const pedido = solicitacoes.find((item) => item.id === cadastro);
    const item = pedido?.itens.find((valor) => valor.id === itemId);
    if (!item || item.quantidade_recebida >= item.quantidade || (atual()?.perfil !== "DESENVOLVEDOR" && item.tecnico_responsavel_id !== usuarioId)) return;
    pedidoEmEdicao = cadastro;
    recebimentoCard.hidden = true;
    const form = document.querySelector("#form-cadastro");
    form.elements.item_id.value = itemId;
    for (const campo of ["marca", "codigo_fornecedor", "local_sala", "local_armazenamento", "data_compra", "valor"]) form.elements[campo].value = item[campo] || "";
    document.querySelector("#cadastro-pedido-nome").textContent = item.nome;
    cadastroCard.hidden = false;
    cadastroCard.scrollIntoView({ behavior: "smooth" });
  }
  if (receber && pode("receber")) {
    const pedido = solicitacoes.find((item) => item.id === receber);
    const item = pedido?.itens.find((valor) => valor.id === itemId);
    if (!item || item.quantidade_recebida >= item.quantidade) return;
    pedidoEmRecebimento = receber;
    cadastroCard.hidden = true;
    const form = document.querySelector("#form-recebimento");
    form.elements.item_id.value = itemId;
    form.elements.quantidade_recebida.value = item.quantidade - (item.quantidade_recebida || 0);
    form.elements.codigo.value = item.codigo || "";
    form.elements.observacao.value = "";
    form.elements.data_entrega.value = new Date().toLocaleDateString("en-CA");
    document.querySelector("#recebimento-pedido-nome").textContent = item.nome;
    recebimentoCard.hidden = false;
    recebimentoCard.scrollIntoView({ behavior: "smooth" });
  }
});

document.querySelector("#cancelar-cadastro").onclick = () => { cadastroCard.hidden = true; pedidoEmEdicao = ""; };
document.querySelector("#cancelar-recebimento").onclick = () => { recebimentoCard.hidden = true; pedidoEmRecebimento = ""; };
document.querySelector("#form-cadastro").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!pedidoEmEdicao || !pode("cadastrar")) return;
  const dados = Object.fromEntries(new FormData(evento.target));
  try {
    await api(`/api/solicitacoes/${encodeURIComponent(pedidoEmEdicao)}/cadastro`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario_id: atual().id, ...dados }) });
    cadastroCard.hidden = true; pedidoEmEdicao = ""; aviso("Dados do pedido cadastrados."); await atualizar();
  } catch (erro) { aviso(erro.message, true); }
});
document.querySelector("#form-recebimento").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!pedidoEmRecebimento || !pode("receber")) return;
  const dados = Object.fromEntries(new FormData(evento.target));
  const quantidade_recebida = Number(dados.quantidade_recebida);
  if (!Number.isInteger(quantidade_recebida) || quantidade_recebida < 1) return;
  try {
    await api(`/api/solicitacoes/${encodeURIComponent(pedidoEmRecebimento)}/receber`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario_id: atual().id, item_id: dados.item_id, quantidade_recebida, codigo: dados.codigo, data_entrega: dados.data_entrega, observacao: dados.observacao }) });
    recebimentoCard.hidden = true; pedidoEmRecebimento = ""; aviso("Recebimento registrado e insumo adicionado ao estoque."); await atualizar();
  } catch (erro) { aviso(erro.message, true); }
});

document.querySelector("#novo-usuario").addEventListener("submit", async (evento) => { evento.preventDefault(); try { await api(`/api/usuarios?ator_id=${encodeURIComponent(atual().id)}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome:document.querySelector("#usuario-nome").value,perfil:document.querySelector("#usuario-perfil").value})}); evento.target.reset(); aviso("Usuário criado."); await carregar(); } catch (erro) { aviso(erro.message, true); } });
document.querySelector("#lista-usuarios").addEventListener("click", async (evento) => { const id=evento.target.dataset.salvarUsuario; if (!id) return; try { const nome=document.querySelector(`[data-nome="${id}"]`).value; const perfilNovo=document.querySelector(`[data-perfil="${id}"]`).value; await api(`/api/usuarios/${id}?ator_id=${encodeURIComponent(atual().id)}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome,perfil:perfilNovo})}); aviso("Usuário atualizado."); await carregar(); } catch (erro) { aviso(erro.message, true); } });
document.querySelector("#apagar-dados").onclick = async () => { if (!confirm("Apagar catálogo, estoque e pedidos? Esta ação não pode ser desfeita.")) return; try { await api(`/api/usuarios/dados/todos?ator_id=${encodeURIComponent(atual().id)}`, {method:"DELETE"}); aviso("Dados operacionais apagados."); await atualizar(); } catch (erro) { aviso(erro.message, true); } };
botoesPerfil.forEach((botao) => {
  botao.onclick = () => {
    const usuario = usuarios.find((item) => item.perfil === botao.dataset.perfil);
    if (!usuario) return;
    usuarioId = usuario.id;
    cadastroCard.hidden = true; recebimentoCard.hidden = true;
    pedidoEmEdicao = ""; pedidoEmRecebimento = "";
    marcarPerfil();
    atualizar().catch((erro) => aviso(erro.message, true));
  };
});
seletorTecnico.onchange = () => { usuarioId = seletorTecnico.value; marcarPerfil(); atualizar().catch((erro) => aviso(erro.message, true)); };
carregar().catch((erro) => aviso(erro.message, true));
