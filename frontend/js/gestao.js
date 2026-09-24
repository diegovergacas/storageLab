import { api } from "./api.js";

const linhas = document.getElementById("linhas");
const resumo = document.getElementById("resumo");
const busca = document.getElementById("busca");
const aviso = document.getElementById("aviso");
const dialogo = document.getElementById("dialogo");
const formulario = document.getElementById("formulario");
const tituloForm = document.getElementById("titulo-form");
const campoCodigo = document.getElementById("codigo");
const campoNome = document.getElementById("nome");
const campoMarca = document.getElementById("marca");
const erroForm = document.getElementById("erro-form");

let itens = [];
let editando = null;

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mostrarAviso(texto) {
  aviso.hidden = !texto;
  aviso.textContent = texto || "";
}

function filtrados() {
  const termo = busca.value.trim().toLowerCase();
  if (!termo) {
    return itens;
  }
  return itens.filter((item) =>
    [item.codigo, item.nome, item.marca].some((campo) =>
      String(campo || "")
        .toLowerCase()
        .includes(termo),
    ),
  );
}

function desenhar() {
  const lista = filtrados();
  const prateleira = itens.reduce((soma, item) => soma + Number(item.prateleira || 0), 0);
  const emprestado = itens.reduce((soma, item) => soma + Number(item.emprestado || 0), 0);
  resumo.innerHTML = `
    <div><span>No catalogo</span><strong>${itens.length}</strong></div>
    <div><span>Na prateleira</span><strong>${prateleira}</strong></div>
    <div><span>Emprestados</span><strong>${emprestado}</strong></div>
  `;
  linhas.innerHTML = lista
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.codigo)}</td>
          <td>${escapeHtml(item.nome)}</td>
          <td>${escapeHtml(item.marca || "—")}</td>
          <td>${item.prateleira}${Number(item.prateleira) < 1 && Number(item.emprestado) < 1 ? " <span class='muted'>catalogo</span>" : ""}</td>
          <td>${item.emprestado}</td>
          <td>
            <div class="acoes">
              <button class="btn btn-primary" data-acao="entrada" data-codigo="${escapeHtml(item.codigo)}">+1</button>
              <button class="btn btn-ghost" data-acao="emprestar" data-codigo="${escapeHtml(item.codigo)}" ${item.prateleira < 1 ? "disabled" : ""}>Emprestar</button>
              <button class="btn btn-ghost" data-acao="devolver" data-codigo="${escapeHtml(item.codigo)}" ${item.emprestado < 1 ? "disabled" : ""}>Devolver</button>
              <button class="btn btn-ghost" data-acao="acabou" data-codigo="${escapeHtml(item.codigo)}" ${item.prateleira < 1 ? "disabled" : ""}>Acabou</button>
              <button class="btn btn-ghost" data-acao="editar" data-codigo="${escapeHtml(item.codigo)}">Editar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

async function carregar() {
  const dados = await api("/api/itens");
  itens = dados.itens || [];
  desenhar();
}

async function acao(tipo, codigo) {
  mostrarAviso("");
  try {
    if (tipo === "entrada") {
      await api(`/api/itens/${encodeURIComponent(codigo)}/entrada`, { method: "POST" });
    } else if (tipo === "emprestar") {
      await api(`/api/itens/${encodeURIComponent(codigo)}/emprestar`, { method: "POST" });
    } else if (tipo === "devolver") {
      await api(`/api/itens/${encodeURIComponent(codigo)}/devolver`, { method: "POST" });
    } else if (tipo === "acabou") {
      await api(`/api/itens/${encodeURIComponent(codigo)}/acabou`, { method: "POST" });
    } else if (tipo === "editar") {
      const item = itens.find((atual) => atual.codigo === codigo);
      abrirFormulario(item);
      return;
    }
    await carregar();
  } catch (erro) {
    mostrarAviso(erro.message);
  }
}

function abrirFormulario(item) {
  editando = item ? item.codigo : null;
  tituloForm.textContent = item ? "Editar item" : "Cadastrar na mão";
  campoCodigo.value = item ? item.codigo : "";
  campoCodigo.readOnly = Boolean(item);
  campoNome.value = item ? item.nome : "";
  campoMarca.value = item ? item.marca : "";
  erroForm.hidden = true;
  dialogo.showModal();
}

linhas.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) {
    return;
  }
  acao(botao.dataset.acao, botao.dataset.codigo);
});

busca.addEventListener("input", desenhar);

document.getElementById("novo").onclick = () => abrirFormulario(null);
document.getElementById("cancelar").onclick = () => dialogo.close();

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroForm.hidden = true;
  const corpo = {
    codigo: campoCodigo.value.trim(),
    nome: campoNome.value.trim(),
    marca: campoMarca.value.trim(),
  };
  try {
    if (editando) {
      await api(`/api/itens/${encodeURIComponent(editando)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: corpo.nome, marca: corpo.marca }),
      });
    } else {
      if (!corpo.codigo || !corpo.nome) {
        throw new Error("Codigo e nome sao obrigatorios");
      }
      await api("/api/itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpo, tipo: "manual" }),
      });
    }
    dialogo.close();
    await carregar();
  } catch (erro) {
    erroForm.hidden = false;
    erroForm.textContent = erro.message;
  }
});

carregar().catch((erro) => mostrarAviso(erro.message));
