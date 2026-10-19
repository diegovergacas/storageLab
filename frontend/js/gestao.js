import { api } from "./api.js";

const linhas = document.getElementById("linhas");
const resumo = document.getElementById("resumo");
const busca = document.getElementById("busca");
const aviso = document.getElementById("aviso");
const dialogo = document.getElementById("dialogo");
const formulario = document.getElementById("formulario");
const tituloForm = document.getElementById("titulo-form");
const campoCodigo = document.getElementById("codigo");
const campoSolicitante = document.getElementById("solicitante");
const campoNome = document.getElementById("nome");
const campoCodigoFornecedor = document.getElementById("codigo-fornecedor");
const campoQuantidade = document.getElementById("quantidade");
const campoUnidade = document.getElementById("unidade");
const campoMarca = document.getElementById("marca");
const campoData = document.getElementById("data");
const campoValor = document.getElementById("valor");
const campoPrevisao = document.getElementById("previsao");
const campoVerba = document.getElementById("verba");
const campoEntregue = document.getElementById("entregue");
const campoDataEntrega = document.getElementById("data-entrega");
const campoLocalSala = document.getElementById("local-sala");
const campoLocalArmazenamento = document.getElementById("local-armazenamento");
const campoBarras = document.getElementById("barras");
const rotuloBarras = document.getElementById("rotulo-barras");
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

function quantidadeTexto(valor) {
  if (valor === undefined || valor === null || valor === "") {
    return "—";
  }
  const numero = Number(valor);
  if (!Number.isNaN(numero) && String(valor).trim() !== "") {
    return Number.isInteger(numero) ? String(numero) : String(numero);
  }
  return String(valor);
}

function camposBusca(item) {
  return [
    item.codigo,
    item.codigo_fornecedor,
    item.nome,
    item.marca,
    item.empresa,
    item.solicitante,
    item.verba,
    item.entregue,
    item.quantidade,
  ];
}

function filtrados() {
  const termo = busca.value.trim().toLowerCase();
  if (!termo) {
    return itens;
  }
  return itens.filter((item) =>
    camposBusca(item).some((campo) =>
      String(campo || "")
        .toLowerCase()
        .includes(termo),
    ),
  );
}

function corpoBase() {
  const empresa = campoMarca.value.trim();
  return {
    codigo: campoCodigo.value.trim(),
    nome: campoNome.value.trim(),
    marca: empresa,
    empresa,
    solicitante: campoSolicitante.value.trim(),
    quantidade: campoQuantidade.value.trim(),
    codigo_fornecedor: campoCodigoFornecedor.value.trim(),
    unidade: campoUnidade.value.trim(),
    data: campoData.value.trim(),
    valor: campoValor.value.trim(),
    previsao: campoPrevisao.value.trim(),
    verba: campoVerba.value.trim(),
    entregue: campoEntregue.value.trim(),
    data_entrega: campoDataEntrega.value.trim(),
    local_sala: campoLocalSala.value.trim(),
    local_armazenamento: campoLocalArmazenamento.value.trim(),
  };
}

function desenhar() {
  const lista = filtrados();
  const prateleira = itens.reduce((soma, item) => soma + Number(item.prateleira || 0), 0);
  const emprestado = itens.reduce((soma, item) => soma + Number(item.emprestado || 0), 0);
  const pendentes = itens.filter((item) => item.pendente_codigo || String(item.codigo || "").startsWith("PLAN-")).length;
  resumo.innerHTML = `
    <div><span>No estoque-base</span><strong>${itens.length}</strong></div>
    <div><span>Na prateleira</span><strong>${prateleira}</strong></div>
    <div><span>Emprestados</span><strong>${emprestado}</strong></div>
    <div><span>Sem codigo de barras</span><strong>${pendentes}</strong></div>
  `;
  linhas.innerHTML = lista
    .map((item) => {
      const pendente = item.pendente_codigo || String(item.codigo || "").startsWith("PLAN-");
      return `
        <tr>
          <td>${escapeHtml(item.solicitante || "—")}</td>
          <td>${escapeHtml(item.nome)}</td>
          <td>${escapeHtml(item.codigo_fornecedor || "—")}</td>
          <td>${escapeHtml(quantidadeTexto(item.quantidade))}</td>
          <td>${escapeHtml(item.unidade || "—")}</td>
          <td>${escapeHtml(item.empresa || item.marca || "—")}</td>
          <td>${escapeHtml(item.data || "—")}</td>
          <td>${escapeHtml(item.valor || "—")}</td>
          <td>${escapeHtml(item.previsao || "—")}</td>
          <td>${escapeHtml(item.verba || "—")}</td>
          <td>${escapeHtml(item.entregue || "—")}</td>
          <td>${escapeHtml(item.data_entrega || "—")}</td>
          <td>${escapeHtml(item.local_sala || "—")}</td>
          <td>${escapeHtml(item.local_armazenamento || "—")}</td>
          <td>${escapeHtml(item.codigo)}${pendente ? " <span class='muted'>ligar codigo</span>" : ""}</td>
          <td>${item.prateleira}${Number(item.prateleira) < 1 && Number(item.emprestado) < 1 ? " <span class='muted'>frasco</span>" : ""}</td>
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
      `;
    })
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
  campoSolicitante.value = item ? item.solicitante || "" : "";
  campoNome.value = item ? item.nome : "";
  campoCodigoFornecedor.value = item ? item.codigo_fornecedor || "" : "";
  campoQuantidade.value = item ? item.quantidade || "" : "";
  campoUnidade.value = item ? item.unidade || "" : "";
  campoMarca.value = item ? item.empresa || item.marca || "" : "";
  campoData.value = item ? item.data || "" : "";
  campoValor.value = item ? item.valor || "" : "";
  campoPrevisao.value = item ? item.previsao || "" : "";
  campoVerba.value = item ? item.verba || "" : "";
  campoEntregue.value = item ? item.entregue || "" : "";
  campoDataEntrega.value = item ? item.data_entrega || "" : "";
  campoLocalSala.value = item ? item.local_sala || "" : "";
  campoLocalArmazenamento.value = item ? item.local_armazenamento || "" : "";
  const pendente = Boolean(item && (item.pendente_codigo || String(item.codigo || "").startsWith("PLAN-")));
  campoBarras.hidden = !pendente;
  rotuloBarras.hidden = !pendente;
  campoBarras.required = false;
  campoBarras.value = "";
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
document.getElementById("importar").onclick = async () => {
  mostrarAviso("");
  try {
    const resultado = await api("/api/itens/importar-planilha", { method: "POST" });
    mostrarAviso(
      `${resultado.produtos_novos} novo(s), ${resultado.produtos_atualizados || 0} atualizado(s) a partir da planilha.`,
    );
    await carregar();
  } catch (erro) {
    mostrarAviso(erro.message);
  }
};
document.getElementById("cancelar").onclick = () => dialogo.close();

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  erroForm.hidden = true;
  const corpo = corpoBase();
  try {
    if (editando) {
      const barras = campoBarras.value.trim();
      if (barras) {
        await api("/api/itens/vincular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo_interno: editando,
            codigo: barras,
            tipo: "manual",
            entrada: false,
          }),
        });
      }
      await api(`/api/itens/${encodeURIComponent(barras || editando)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
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
