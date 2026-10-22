import { api } from "./api.js";

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

const permissoes = {
  DESENVOLVEDOR: ["pedir", "cadastrar", "receber", "gerir_usuarios", "apagar_dados"],
  GERENTE: ["pedir", "cadastrar", "receber", "gerir_usuarios"],
  TECNICO: ["pedir", "cadastrar", "receber"],
  ALUNO: ["pedir", "receber"],
};

function escapar(valor) { return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function atual() { return usuarios.find((usuario) => usuario.id === usuarioId); }
function pode(acao) { return permissoes[atual()?.perfil]?.includes(acao); }
function aviso(texto, erro = false) { mensagem.textContent = texto || ""; mensagem.style.color = erro ? "#9d3f1c" : "#2f6b45"; }

async function carregar() {
  const dados = await api("/api/usuarios");
  usuarios = dados.usuarios;
  const salvo = localStorage.getItem("storagelab-usuario");
  usuarioId = usuarios.some((usuario) => usuario.id === salvo) ? salvo : usuarios.find((usuario) => usuario.perfil === "ALUNO")?.id || usuarios[0]?.id;
  marcarPerfil();
  await atualizar();
}

async function atualizar() {
  const usuario = atual();
  if (!usuario) return;
  localStorage.setItem("storagelab-usuario", usuario.id);
  perfil.textContent = `Perfil atual: ${usuario.perfil}`;
  usuariosCard.hidden = !pode("gerir_usuarios");
  dadosCard.hidden = !pode("apagar_dados");
  const [pedidos, notificacoes] = await Promise.all([api("/api/solicitacoes"), api(`/api/solicitacoes/notificacoes?usuario_id=${encodeURIComponent(usuario.id)}`)]);
  solicitacoes = pedidos.solicitacoes;
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
    const podeCadastrar = pode("cadastrar") && pedido.status !== "DISPONIVEL";
    const podeReceber = pode("receber") && pedido.status !== "DISPONIVEL";
    return `<article class="pedido"><h3>${escapar(pedido.nome)}</h3><p><span class="status">${escapar(pedido.status)}</span> ${pedido.quantidade} ${escapar(pedido.unidade)} · solicitado por ${escapar(pedido.solicitante)}</p><p class="muted">${escapar(pedido.observacao || "Sem observação")}</p>${pedido.status === "DISPONIVEL" ? `<p>Disponível no estoque: <strong>${escapar(pedido.item_codigo)}</strong>. Recebido por ${escapar(pedido.recebido_por)}.</p>` : ""}<div class="acoes">${podeCadastrar ? `<button data-cadastro="${escapar(pedido.id)}">Cadastrar dados</button>` : ""}${podeReceber ? `<button data-receber="${escapar(pedido.id)}">Registrar recebimento</button>` : ""}</div></article>`;
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
    await api("/api/solicitacoes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ usuario_id:atual().id, nome:document.querySelector("#pedido-nome").value, quantidade:Number(document.querySelector("#pedido-quantidade").value), unidade:document.querySelector("#pedido-unidade").value, observacao:document.querySelector("#pedido-observacao").value }) });
    evento.target.reset(); document.querySelector("#pedido-quantidade").value = 1; document.querySelector("#pedido-unidade").value = "frasco";
    aviso("Pedido enviado. Os técnicos foram avisados."); await atualizar();
  } catch (erro) { aviso(erro.message, true); }
});

lista.addEventListener("click", async (evento) => {
  const cadastro = evento.target.dataset.cadastro;
  const receber = evento.target.dataset.receber;
  try {
    if (cadastro) {
      const pedido = solicitacoes.find((item) => item.id === cadastro);
      const marca = prompt("Marca/empresa:", pedido.marca || ""); if (marca === null) return;
      const codigo_fornecedor = prompt("Código do fornecedor:", pedido.codigo_fornecedor || ""); if (codigo_fornecedor === null) return;
      const local_sala = prompt("Local/sala:", pedido.local_sala || ""); if (local_sala === null) return;
      const local_armazenamento = prompt("Armário, freezer ou geladeira:", pedido.local_armazenamento || ""); if (local_armazenamento === null) return;
      await api(`/api/solicitacoes/${cadastro}/cadastro`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({usuario_id:atual().id, marca, codigo_fornecedor, local_sala, local_armazenamento}) }); aviso("Dados do pedido cadastrados.");
    }
    if (receber) {
      const pedido = solicitacoes.find((item) => item.id === receber);
      const quantidade_recebida = Number(prompt("Quantidade recebida:", pedido.quantidade)); if (!Number.isInteger(quantidade_recebida) || quantidade_recebida < 1) return;
      const codigo = prompt("Código de barras (deixe vazio para gerar código interno):", ""); if (codigo === null) return;
      await api(`/api/solicitacoes/${receber}/receber`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({usuario_id:atual().id, quantidade_recebida, codigo}) }); aviso("Recebimento registrado e insumo adicionado ao estoque.");
    }
    await atualizar();
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
    marcarPerfil();
    atualizar().catch((erro) => aviso(erro.message, true));
  };
});
carregar().catch((erro) => aviso(erro.message, true));
