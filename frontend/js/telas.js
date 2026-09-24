import { api } from "./api.js";
import { codigoChave } from "./codigo.js";
import { estado } from "./estado.js";
import { escapeHtml, tela } from "./html.js";
import { iniciarScanner, pararLeitor, pedirCamera } from "./scanner.js";

export function inicio() {
  tela(`
    <p class="hero">Aponte o celular para o codigo. Se o produto ja passou pelo lab, vai para a conferencia. Se for a primeira vez, tira foto do rotulo.</p>
    <button class="btn btn-primary" id="ler">Ler codigo</button>
    <button class="btn btn-ghost" id="digitar">Digitar codigo</button>
  `);
  document.getElementById("ler").onclick = abrirCamera;
  document.getElementById("digitar").onclick = () => codigoManual();
}

async function abrirCamera() {
  const botao = document.getElementById("ler");
  if (botao) {
    botao.disabled = true;
  }
  try {
    const stream = await pedirCamera();
    estado.stream = stream;
    mostrarScanner(stream);
  } catch (erro) {
    codigoManual(
      erro?.message || "A camera nao abriu. Permita o acesso ou digite o codigo.",
    );
  }
}

function mostrarScanner(stream) {
  tela(`
    <div class="scan-wrap">
      <video id="preview" class="scan-video" playsinline webkit-playsinline autoplay muted></video>
      <div id="reader" class="scan-fallback"></div>
      <div class="scan-frame"></div>
    </div>
    <p class="hint">Segure firme ate confirmar a leitura. Luz boa ajuda.</p>
    <button class="btn btn-ghost" id="manual">Nao leu? Digitar</button>
    <button class="btn btn-ghost" id="voltar">Cancelar</button>
  `);

  const video = document.getElementById("preview");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.muted = true;
  video.srcObject = stream;
  video.play().catch(() => {});

  document.getElementById("manual").onclick = async () => {
    await pararLeitor();
    codigoManual();
  };
  document.getElementById("voltar").onclick = async () => {
    await pararLeitor();
    inicio();
  };

  iniciarScanner(video, receberCodigo).catch(async () => {
    await pararLeitor();
    codigoManual("Nao consegui iniciar a leitura. Digite o codigo.");
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
    </div>
    <button class="btn btn-primary" id="ok" style="margin-top:16px">Continuar</button>
    <button class="btn btn-ghost" id="voltar">Voltar</button>
  `);
  document.getElementById("ok").onclick = () => {
    const codigo = document.getElementById("codigo").value.trim();
    if (!codigo) {
      return;
    }
    receberCodigo(codigo, "manual");
  };
  document.getElementById("voltar").onclick = inicio;
}

async function receberCodigo(codigo, tipo) {
  estado.codigo = codigoChave(codigo);
  estado.tipo = tipo || "codigo";
  tela(`
    <div class="card">
      <p class="kicker">Codigo lido</p>
      <h2>${escapeHtml(estado.codigo)}</h2>
      <p class="meta">Procurando no estoque...</p>
    </div>
  `);
  try {
    const item = await api(
      `/api/itens/localizar?codigo=${encodeURIComponent(estado.codigo)}`,
    );
    conferencia(item);
  } catch {
    cadastroNovo();
  }
}

function conferencia(item) {
  tela(`
    <div class="card">
      <p class="kicker">${item.prateleira < 1 && item.emprestado < 1 ? "Ja conhecido no lab" : "Conferencia"}</p>
      <h2>${escapeHtml(item.nome)}</h2>
      <p class="meta">${escapeHtml(item.marca || "sem marca")}<br>${escapeHtml(item.codigo)}</p>
      <div class="qty">
        <div><span>Prateleira</span><strong>${item.prateleira}</strong></div>
        <div><span>Emprestado</span><strong>${item.emprestado}</strong></div>
      </div>
    </div>
    <button class="btn btn-primary" id="confirmar" style="margin-top:16px">Confirmar entrada (+1)</button>
    <button class="btn btn-ghost" id="acabou" ${item.prateleira < 1 ? "disabled" : ""}>Acabou (-1)</button>
    <button class="btn btn-ghost" id="outro">Ler outro</button>
    <button class="btn btn-ghost" id="inicio">Inicio</button>
  `);
  document.getElementById("confirmar").onclick = () => confirmarEntrada(item);
  document.getElementById("acabou").onclick = () => confirmarAcabou(item);
  document.getElementById("outro").onclick = abrirCamera;
  document.getElementById("inicio").onclick = inicio;
}

async function confirmarAcabou(item) {
  const botao = document.getElementById("acabou");
  botao.disabled = true;
  try {
    const atual = await api(`/api/itens/${encodeURIComponent(item.codigo)}/acabou`, {
      method: "POST",
    });
    tela(`
      <div class="card">
        <p class="kicker warn">Baixa registrada</p>
        <h2>${escapeHtml(atual.nome)}</h2>
        <p class="meta">${escapeHtml(atual.marca || "sem marca")}</p>
        <div class="qty">
          <div><span>Prateleira</span><strong>${atual.prateleira}</strong></div>
          <div><span>Emprestado</span><strong>${atual.emprestado}</strong></div>
        </div>
      </div>
      <button class="btn btn-primary" id="outro" style="margin-top:16px">Ler outro</button>
      <button class="btn btn-ghost" id="inicio">Inicio</button>
    `);
    document.getElementById("outro").onclick = abrirCamera;
    document.getElementById("inicio").onclick = inicio;
  } catch (erro) {
    botao.disabled = false;
    conferencia(item);
  }
}

async function confirmarEntrada(item) {
  const botao = document.getElementById("confirmar");
  botao.disabled = true;
  const atual = await api(`/api/itens/${encodeURIComponent(item.codigo)}/entrada`, {
    method: "POST",
  });
  tela(`
    <div class="card">
      <p class="kicker">Entrada confirmada</p>
      <h2>${escapeHtml(atual.nome)}</h2>
      <p class="meta">${escapeHtml(atual.marca || "sem marca")}</p>
      <div class="qty">
        <div><span>Prateleira</span><strong>${atual.prateleira}</strong></div>
        <div><span>Emprestado</span><strong>${atual.emprestado}</strong></div>
      </div>
    </div>
    <button class="btn btn-primary" id="outro" style="margin-top:16px">Ler outro</button>
    <button class="btn btn-ghost" id="inicio">Inicio</button>
  `);
  document.getElementById("outro").onclick = abrirCamera;
  document.getElementById("inicio").onclick = inicio;
}

function cadastroNovo() {
  estado.fotoUrl = "";
  estado.ocr = { nome: "", marca: "" };
  tela(`
    <div class="card">
      <p class="kicker warn">Nao cadastrado</p>
      <h2>Foto do rotulo</h2>
      <p class="meta">O codigo ${escapeHtml(estado.codigo)} nao esta no estoque. Tire uma foto nitida do rotulo para o OCR preencher nome e marca. Depois corrija se precisar.</p>
      <label for="codigo">Codigo</label>
      <input id="codigo" value="${escapeHtml(estado.codigo)}" readonly />
      <label for="nome">Nome</label>
      <input id="nome" autocomplete="off" />
      <label for="marca">Marca</label>
      <input id="marca" autocomplete="off" />
      <p id="ocr-status" class="ocr-status">Abrindo a camera do rotulo...</p>
      <img id="preview-foto" class="photo hidden-file" alt="Rotulo" />
    </div>
    <input id="arquivo" class="hidden-file" type="file" accept="image/*" capture="environment" />
    <button class="btn btn-ghost" id="foto" style="margin-top:16px">Tirar outra foto</button>
    <button class="btn btn-primary" id="salvar">Salvar no estoque</button>
    <button class="btn btn-ghost" id="voltar">Cancelar</button>
  `);
  const arquivo = document.getElementById("arquivo");
  document.getElementById("foto").onclick = () => arquivo.click();
  arquivo.onchange = () => {
    if (arquivo.files[0]) {
      processarFoto(arquivo.files[0]);
    }
  };
  document.getElementById("salvar").onclick = salvarNovo;
  document.getElementById("voltar").onclick = inicio;
  arquivo.click();
}

async function processarFoto(arquivo) {
  const status = document.getElementById("ocr-status");
  const botao = document.getElementById("foto");
  status.textContent = "Lendo o rotulo com Tesseract...";
  botao.disabled = true;
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  try {
    const lido = await api("/api/ocr", { method: "POST", body: corpo });
    estado.fotoUrl = lido.url;
    estado.ocr = { nome: lido.nome || "", marca: lido.marca || "" };
    const preview = document.getElementById("preview-foto");
    preview.src = lido.url;
    preview.classList.remove("hidden-file");
    const nome = document.getElementById("nome");
    const marca = document.getElementById("marca");
    if (lido.nome) {
      nome.value = lido.nome;
    }
    if (lido.marca) {
      marca.value = lido.marca;
    }
    status.textContent = lido.nome
      ? "OCR preencheu. Corrija se estiver errado."
      : "OCR nao leu o nome. Digite os campos.";
  } catch (erro) {
    status.textContent = erro.message || "Nao consegui ler o rotulo. Digite os campos.";
  }
  botao.disabled = false;
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
      <p class="meta">${escapeHtml(item.marca || "sem marca")}<br>${escapeHtml(item.codigo)}</p>
      <div class="qty">
        <div><span>Prateleira</span><strong>${item.prateleira}</strong></div>
        <div><span>Emprestado</span><strong>${item.emprestado}</strong></div>
      </div>
    </div>
    <button class="btn btn-primary" id="outro" style="margin-top:16px">Ler outro</button>
    <button class="btn btn-ghost" id="inicio">Inicio</button>
  `);
  document.getElementById("outro").onclick = abrirCamera;
  document.getElementById("inicio").onclick = inicio;
}
