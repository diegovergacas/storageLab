import { api } from "./api.js";
import { codigoChave } from "./codigo.js";
import { estado } from "./estado.js";
import { escapeHtml, tela } from "./html.js";
import { iniciarScanner, pararLeitor, pedirCamera } from "./scanner.js";

let itensPendentes = [];

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
    escolherCadastro();
  }
}

function escolherCadastro() {
  tela(`
    <div class="card">
      <p class="kicker warn">Nao cadastrado</p>
      <h2>Como deseja cadastrar?</h2>
      <p class="meta">O codigo ${escapeHtml(estado.codigo)} ainda nao esta no estoque.</p>
    </div>
    <button class="btn btn-primary" id="cadastrar-manual" style="margin-top:16px">Cadastrar na mao</button>
    <button class="btn btn-ghost" id="cadastrar-foto">Cadastrar com foto do rotulo</button>
    <button class="btn btn-ghost" id="voltar">Ler outro codigo</button>
  `);
  document.getElementById("cadastrar-manual").onclick = () => cadastroNovo(false);
  document.getElementById("cadastrar-foto").onclick = () => cadastroNovo(true);
  document.getElementById("voltar").onclick = inicio;
}

function conferencia(item) {
  tela(`
    <div class="card">
      <p class="kicker">${item.prateleira < 1 && item.emprestado < 1 ? "Ja conhecido no lab" : "Conferencia"}</p>
      <h2>${escapeHtml(item.nome)}</h2>
      <p class="meta">${escapeHtml(item.marca || item.empresa || "sem marca")}<br>${escapeHtml(item.codigo)}</p>
      <dl class="details">
        <div><dt>Codigo do fornecedor</dt><dd>${escapeHtml(item.codigo_fornecedor || "—")}</dd></div>
        <div><dt>Unidade</dt><dd>${escapeHtml(item.unidade || "—")}</dd></div>
        <div><dt>Local</dt><dd>${escapeHtml([item.local_sala, item.local_armazenamento].filter(Boolean).join(" · ") || "—")}</dd></div>
      </dl>
      <div class="qty">
        <div><span>Prateleira</span><strong>${item.prateleira}</strong></div>
        <div><span>Emprestado</span><strong>${item.emprestado}</strong></div>
      </div>
    </div>
    <label for="quantidade-entrada">Quantidade recebida</label>
    <input id="quantidade-entrada" type="number" inputmode="numeric" min="1" step="1" value="1" />
    <button class="btn btn-primary" id="confirmar" style="margin-top:16px">Confirmar entrada</button>
    <button class="btn btn-ghost" id="acabou" ${item.prateleira < 1 ? "disabled" : ""}>Acabou (-1)</button>
    <button class="btn btn-ghost" id="editar">Editar dados</button>
    <button class="btn btn-ghost" id="outro">Ler outro</button>
    <button class="btn btn-ghost" id="inicio">Inicio</button>
  `);
  document.getElementById("confirmar").onclick = () => confirmarEntrada(item);
  document.getElementById("acabou").onclick = () => confirmarAcabou(item);
  document.getElementById("editar").onclick = () => editarItem(item);
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
  const quantidade = Number(document.getElementById("quantidade-entrada").value);
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    document.getElementById("quantidade-entrada").focus();
    return;
  }
  const botao = document.getElementById("confirmar");
  botao.disabled = true;
  const atual = await api(`/api/itens/${encodeURIComponent(item.codigo)}/entrada`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantidade }),
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

function editarItem(item) {
  tela(`
    <div class="card">
      <p class="kicker">Editar cadastro</p>
      <h2>${escapeHtml(item.nome)}</h2>
      <p class="meta">O codigo de leitura nao pode ser alterado aqui.</p>
      <label for="editar-nome">Reagente / Material</label>
      <input id="editar-nome" value="${escapeHtml(item.nome)}" required />
      <label for="editar-marca">Empresa / marca</label>
      <input id="editar-marca" value="${escapeHtml(item.empresa || item.marca || "")}" />
      <label for="editar-codigo-fornecedor">Codigo do fornecedor</label>
      <input id="editar-codigo-fornecedor" value="${escapeHtml(item.codigo_fornecedor || "")}" />
      <label for="editar-unidade">Unidade</label>
      <input id="editar-unidade" value="${escapeHtml(item.unidade || "")}" />
      <label for="editar-local-sala">Local / sala</label>
      <input id="editar-local-sala" value="${escapeHtml(item.local_sala || "")}" />
      <label for="editar-local-armazenamento">Armario, freezer ou geladeira</label>
      <input id="editar-local-armazenamento" value="${escapeHtml(item.local_armazenamento || "")}" />
    </div>
    <button class="btn btn-primary" id="salvar-edicao" style="margin-top:16px">Salvar alteracoes</button>
    <button class="btn btn-ghost" id="cancelar-edicao">Cancelar</button>
  `);
  document.getElementById("salvar-edicao").onclick = async () => {
    const nome = document.getElementById("editar-nome").value.trim();
    if (!nome) {
      document.getElementById("editar-nome").focus();
      return;
    }
    const empresa = document.getElementById("editar-marca").value.trim();
    const botao = document.getElementById("salvar-edicao");
    botao.disabled = true;
    try {
      const atual = await api(`/api/itens/${encodeURIComponent(item.codigo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          marca: empresa,
          empresa,
          codigo_fornecedor: document.getElementById("editar-codigo-fornecedor").value.trim(),
          unidade: document.getElementById("editar-unidade").value.trim(),
          local_sala: document.getElementById("editar-local-sala").value.trim(),
          local_armazenamento: document.getElementById("editar-local-armazenamento").value.trim(),
        }),
      });
      conferencia(atual);
    } catch {
      botao.disabled = false;
    }
  };
  document.getElementById("cancelar-edicao").onclick = () => conferencia(item);
}

function cadastroNovo(abrirFoto = false) {
  estado.fotoUrl = "";
  estado.ocr = { nome: "", marca: "" };
  tela(`
    <div class="card">
      <p class="kicker warn">Nao cadastrado</p>
      <h2>${abrirFoto ? "Foto do rotulo" : "Cadastrar na mao"}</h2>
      <p class="meta">O codigo ${escapeHtml(estado.codigo)} nao esta no estoque. Se ja veio da planilha de compras, ligue ao produto. Se for novo, preencha os dados abaixo.</p>
      <label for="codigo">Codigo</label>
      <input id="codigo" value="${escapeHtml(estado.codigo)}" readonly />
      <label for="catalogo">Ja esta no catalogo da planilha?</label>
      <select id="catalogo">
        <option value="">Nao, e um produto novo</option>
      </select>
      <label for="solicitante">Solicitante</label>
      <input id="solicitante" autocomplete="name" />
      <label for="nome">Reagente / Material</label>
      <input id="nome" autocomplete="off" />
      <label for="codigo-fornecedor">Codigo do fornecedor</label>
      <input id="codigo-fornecedor" autocomplete="off" />
      <label for="quantidade">Quantidade</label>
      <input id="quantidade" inputmode="decimal" />
      <label for="unidade">Unidade</label>
      <input id="unidade" autocomplete="off" />
      <label for="marca">Empresa / marca</label>
      <input id="marca" autocomplete="off" />
      <label for="data">Data</label>
      <input id="data" type="date" />
      <label for="valor-brl">Valor (R$)</label>
      <input id="valor-brl" inputmode="decimal" />
      <label for="valor-usd">Valor (US$)</label>
      <input id="valor-usd" inputmode="decimal" />
      <label for="previsao">Previsao</label>
      <input id="previsao" autocomplete="off" />
      <label for="verba">Verba</label>
      <input id="verba" autocomplete="off" />
      <label for="entregue">Entregue</label>
      <select id="entregue">
        <option value="">Nao informado</option>
        <option value="Não">Não</option>
        <option value="Sim">Sim</option>
      </select>
      <label for="data-entrega">Data da entrega</label>
      <input id="data-entrega" type="date" />
      <label for="local-sala">Local / sala</label>
      <input id="local-sala" autocomplete="off" />
      <label for="local-armazenamento">Armario, freezer ou geladeira</label>
      <input id="local-armazenamento" autocomplete="off" />
      <p id="ocr-status" class="ocr-status">A foto do rotulo e opcional.</p>
      <img id="preview-foto" class="photo hidden-file" alt="Rotulo" />
    </div>
    <input id="arquivo" class="hidden-file" type="file" accept="image/*" capture="environment" />
    <button class="btn btn-ghost" id="foto" style="margin-top:16px">${abrirFoto ? "Tirar outra foto" : "Adicionar foto do rotulo"}</button>
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
  carregarPendentes();
  if (abrirFoto) {
    arquivo.click();
  }
}

async function carregarPendentes() {
  const select = document.getElementById("catalogo");
  if (!select) {
    return;
  }
  try {
    const dados = await api("/api/itens/pendentes");
    itensPendentes = dados.itens || [];
    select.innerHTML = [
      '<option value="">Nao, e um produto novo</option>',
      ...itensPendentes.map(
        (item) =>
          `<option value="${escapeHtml(item.codigo)}">${escapeHtml(item.nome)} — ${escapeHtml(item.empresa || item.marca || "")}</option>`,
      ),
    ].join("");
    select.onchange = () => {
      const item = itensPendentes.find((atual) => atual.codigo === select.value);
      if (item) {
        preencherCadastro(item);
      }
    };
  } catch {
    select.innerHTML = '<option value="">Nao, e um produto novo</option>';
  }
}

function preencherCadastro(item) {
  document.getElementById("nome").value = item.nome || "";
  document.getElementById("marca").value = item.empresa || item.marca || "";
  document.getElementById("solicitante").value = item.solicitante || "";
  document.getElementById("codigo-fornecedor").value = item.codigo_fornecedor || "";
  document.getElementById("quantidade").value = item.quantidade || "";
  document.getElementById("unidade").value = item.unidade || "";
  document.getElementById("data").value = item.data || "";
  document.getElementById("valor-brl").value = item.valor_brl || (item.valor_usd ? "" : item.valor || "");
  document.getElementById("valor-usd").value = item.valor_usd || "";
  document.getElementById("previsao").value = item.previsao || "";
  document.getElementById("verba").value = item.verba || "";
  document.getElementById("entregue").value = item.entregue || "";
  document.getElementById("data-entrega").value = item.data_entrega || "";
  document.getElementById("local-sala").value = item.local_sala || "";
  document.getElementById("local-armazenamento").value = item.local_armazenamento || "";
}

function dadosCadastro() {
  const marca = document.getElementById("marca").value.trim();
  return {
    nome: document.getElementById("nome").value.trim(),
    marca,
    empresa: marca,
    solicitante: document.getElementById("solicitante").value.trim(),
    codigo_fornecedor: document.getElementById("codigo-fornecedor").value.trim(),
    quantidade: document.getElementById("quantidade").value.trim(),
    unidade: document.getElementById("unidade").value.trim(),
    data: document.getElementById("data").value,
    valor_brl: document.getElementById("valor-brl").value.trim(),
    valor_usd: document.getElementById("valor-usd").value.trim(),
    previsao: document.getElementById("previsao").value.trim(),
    verba: document.getElementById("verba").value.trim(),
    entregue: document.getElementById("entregue").value,
    data_entrega: document.getElementById("data-entrega").value,
    local_sala: document.getElementById("local-sala").value.trim(),
    local_armazenamento: document.getElementById("local-armazenamento").value.trim(),
  };
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
  const interno = document.getElementById("catalogo")?.value;
  const dados = dadosCadastro();
  const { nome, marca } = dados;
  if (!interno && !nome) {
    document.getElementById("nome").focus();
    return;
  }
  document.getElementById("salvar").disabled = true;
  let item;
  if (interno) {
    const vinculado = await api("/api/itens/vincular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_interno: interno,
          codigo: estado.codigo,
          tipo: estado.tipo,
        }),
      });
    item = await api(`/api/itens/${encodeURIComponent(vinculado.codigo)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
  } else {
    item = await api("/api/itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: estado.codigo,
          tipo: estado.tipo,
          ...dados,
          foto: estado.fotoUrl,
        }),
      });
  }
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
