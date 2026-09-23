import { api } from "./api.js";
import { estado } from "./estado.js";
import { escapeHtml, tela } from "./html.js";
import { lerRotulo } from "./ocr.js";
import { iniciarScanner, pararLeitor } from "./scanner.js";

export function inicio() {
  api("/api/itens")
    .then(({ itens }) => {
      const lista = itens
        .slice(0, 6)
        .map(
          (item) => `
            <div class="row">
              <div>
                <b>${escapeHtml(item.nome)}</b>
                <span>${escapeHtml(item.marca || "sem marca")}</span>
              </div>
              <strong>${item.prateleira}</strong>
            </div>
          `,
        )
        .join("");

      tela(`
        <p class="hero">Aponte o celular para o codigo de barras ou QR. Se o reagente ja existir, soma 1. Se for novo, tira foto da embalagem e corrige o que o OCR ler.</p>
        <button class="btn btn-primary" id="ler">Ler codigo</button>
        <button class="btn btn-ghost" id="digitar">Digitar codigo</button>
        <section class="list">
          <h3>Na prateleira</h3>
          ${lista || "<p class='meta'>Nenhum item ainda.</p>"}
        </section>
      `);

      document.getElementById("ler").onclick = scanner;
      document.getElementById("digitar").onclick = () => codigoManual();
    })
    .catch(() => {
      tela("<p class='hero'>Nao consegui abrir o estoque.</p>");
    });
}

function codigoManual(mensagem) {
  tela(`
    <div class="card">
      <p class="kicker">Codigo</p>
      <h2>Digite o codigo</h2>
      <p class="meta">${escapeHtml(mensagem || "Use se a camera nao ler.")}</p>
      <label for="codigo">Barras ou QR</label>
      <input id="codigo" autocomplete="off" />
      <label for="tipo">Tipo</label>
      <input id="tipo" value="manual" />
    </div>
    <button class="btn btn-primary" id="ok" style="margin-top:16px">Continuar</button>
    <button class="btn btn-ghost" id="voltar">Voltar</button>
  `);
  document.getElementById("ok").onclick = () => {
    const codigo = document.getElementById("codigo").value.trim();
    if (!codigo) {
      return;
    }
    receberCodigo(codigo, document.getElementById("tipo").value.trim() || "manual");
  };
  document.getElementById("voltar").onclick = inicio;
}

async function scanner() {
  tela(`
    <div id="reader" class="scan-box"></div>
    <p class="hint">Enquadre o codigo. Luz boa ajuda.</p>
    <button class="btn btn-ghost" id="manual">Nao leu? Digitar</button>
    <button class="btn btn-ghost" id="voltar">Cancelar</button>
  `);

  document.getElementById("manual").onclick = async () => {
    await pararLeitor();
    codigoManual();
  };
  document.getElementById("voltar").onclick = async () => {
    await pararLeitor();
    inicio();
  };

  await iniciarScanner(receberCodigo, () => {
    codigoManual("A camera nao abriu neste aparelho. Digite o codigo.");
  });
}

async function receberCodigo(codigo, tipo) {
  estado.codigo = codigo.trim();
  estado.tipo = tipo || "codigo";
  try {
    const item = await api(`/api/itens/${encodeURIComponent(estado.codigo)}/entrada`, {
      method: "POST",
    });
    itemEncontrado(item);
  } catch {
    itemNovo();
  }
}

function itemEncontrado(item) {
  tela(`
    <div class="card">
      <p class="kicker">Ja estava no estoque</p>
      <h2>${escapeHtml(item.nome)}</h2>
      <p class="meta">${escapeHtml(item.marca || "sem marca")}<br>${escapeHtml(item.codigo)}</p>
      <div class="qty">
        <div><span>Prateleira</span><strong>${item.prateleira}</strong></div>
        <div><span>Emprestado</span><strong>${item.emprestado}</strong></div>
      </div>
    </div>
    <button class="btn btn-primary" id="outro" style="margin-top:16px">Ler outro</button>
    <button class="btn btn-ghost" id="inicio">Inicio</button>
  `);
  document.getElementById("outro").onclick = scanner;
  document.getElementById("inicio").onclick = inicio;
}

function itemNovo() {
  estado.fotoUrl = "";
  estado.ocr = { nome: "", marca: "" };
  tela(`
    <div class="card">
      <p class="kicker warn">Nao cadastrado</p>
      <h2>Foto da embalagem</h2>
      <p class="meta">Codigo ${escapeHtml(estado.codigo)}. Tire uma foto nítida do rotulo para o OCR ler nome e marca.</p>
    </div>
    <button class="btn btn-primary" id="foto" style="margin-top:16px">Abrir camera</button>
    <input id="arquivo" class="hidden-file" type="file" accept="image/*" capture="environment" />
    <button class="btn btn-ghost" id="voltar">Cancelar</button>
  `);
  const arquivo = document.getElementById("arquivo");
  document.getElementById("foto").onclick = () => arquivo.click();
  arquivo.onchange = () => {
    if (arquivo.files[0]) {
      processarFoto(arquivo.files[0]);
    }
  };
  document.getElementById("voltar").onclick = inicio;
}

async function processarFoto(arquivo) {
  tela(`
    <p class="ocr-status">Lendo o rotulo...</p>
    <div class="card"><p class="meta">OCR em andamento. Depois voce corrige no celular.</p></div>
  `);

  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  const { url } = await api("/api/fotos", { method: "POST", body: corpo });
  estado.fotoUrl = url;

  try {
    estado.ocr = await lerRotulo(arquivo);
  } catch {
    estado.ocr = { nome: "", marca: "" };
  }
  correcao();
}

function correcao() {
  tela(`
    <div class="card">
      <p class="kicker">Corrija no celular</p>
      <h2>Confira o que o OCR leu</h2>
      ${estado.fotoUrl ? `<img class="photo" src="${escapeHtml(estado.fotoUrl)}" alt="Embalagem" />` : ""}
      <p class="ocr-status">Se estiver errado, edite antes de gravar.</p>
      <label for="nome">Nome</label>
      <input id="nome" value="${escapeHtml(estado.ocr.nome)}" />
      <label for="marca">Marca</label>
      <input id="marca" value="${escapeHtml(estado.ocr.marca)}" />
      <label for="codigo">Codigo</label>
      <input id="codigo" value="${escapeHtml(estado.codigo)}" readonly />
    </div>
    <button class="btn btn-primary" id="salvar" style="margin-top:16px">Salvar no estoque</button>
    <button class="btn btn-ghost" id="voltar">Voltar</button>
  `);
  document.getElementById("salvar").onclick = salvarNovo;
  document.getElementById("voltar").onclick = itemNovo;
}

async function salvarNovo() {
  const nome = document.getElementById("nome").value.trim();
  const marca = document.getElementById("marca").value.trim();
  if (!nome) {
    document.getElementById("nome").focus();
    return;
  }
  document.getElementById("salvar").disabled = true;
  const item = await api("/api/itens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      codigo: estado.codigo,
      tipo: estado.tipo,
      nome,
      marca,
      foto: estado.fotoUrl,
    }),
  });
  tela(`
    <div class="card">
      <p class="kicker">Cadastrado</p>
      <h2>${escapeHtml(item.nome)}</h2>
      <p class="meta">${escapeHtml(item.marca || "sem marca")}</p>
      <div class="qty">
        <div><span>Prateleira</span><strong>${item.prateleira}</strong></div>
        <div><span>Emprestado</span><strong>${item.emprestado}</strong></div>
      </div>
    </div>
    <button class="btn btn-primary" id="outro" style="margin-top:16px">Ler outro</button>
    <button class="btn btn-ghost" id="inicio">Inicio</button>
  `);
  document.getElementById("outro").onclick = scanner;
  document.getElementById("inicio").onclick = inicio;
}
