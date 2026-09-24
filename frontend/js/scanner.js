import { leituraValida } from "./codigo.js";
import { estado } from "./estado.js";

const FORMATOS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "codabar",
  "itf",
  "qr_code",
  "data_matrix",
];

const CONFIRMACOES = 3;

function nomeTipo(formato) {
  return String(formato || "codigo").replaceAll("_", " ");
}

function confirmarLeitura(codigo, formato) {
  const chave = leituraValida(codigo, formato);
  if (!chave) {
    estado.ultimoCodigo = "";
    estado.leiturasIguais = 0;
    return false;
  }
  if (estado.ultimoCodigo === chave) {
    estado.leiturasIguais += 1;
  } else {
    estado.ultimoCodigo = chave;
    estado.leiturasIguais = 1;
  }
  if (estado.leiturasIguais < CONFIRMACOES) {
    return false;
  }
  return true;
}

export async function pedirCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este navegador nao expoe a camera.");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
}

export async function pararLeitor() {
  if (estado.raf) {
    cancelAnimationFrame(estado.raf);
    estado.raf = 0;
  }
  if (estado.stream) {
    for (const faixa of estado.stream.getTracks()) {
      faixa.stop();
    }
    estado.stream = null;
  }
  if (estado.leitor) {
    try {
      await estado.leitor.stop();
    } catch {
      /* ja parado */
    }
    estado.leitor = null;
  }
}

export async function iniciarScanner(video, aoLer) {
  estado.lido = false;
  estado.ultimoCodigo = "";
  estado.leiturasIguais = 0;

  const aceitar = async (codigo, formato) => {
    if (estado.lido || !confirmarLeitura(codigo, formato)) {
      return;
    }
    estado.lido = true;
    const chave = leituraValida(codigo, formato);
    const tipo = nomeTipo(formato);
    await pararLeitor();
    aoLer(chave, tipo);
  };

  if (window.BarcodeDetector) {
    const detector = new BarcodeDetector({ formats: FORMATOS });
    const lerQuadro = async () => {
      if (estado.lido || !estado.stream) {
        return;
      }
      try {
        const achados = await detector.detect(video);
        if (achados[0]?.rawValue) {
          await aceitar(achados[0].rawValue, achados[0].format);
        }
      } catch {
        /* quadro sem codigo */
      }
      if (!estado.lido) {
        estado.raf = requestAnimationFrame(lerQuadro);
      }
    };
    estado.raf = requestAnimationFrame(lerQuadro);
    return;
  }

  estado.leitor = new Html5Qrcode("reader");
  await estado.leitor.start(
    { facingMode: "environment" },
    { fps: 12, qrbox: { width: 260, height: 160 } },
    async (texto, resultado) => {
      const tipo = resultado?.result?.format?.formatName || "codigo";
      await aceitar(texto, tipo);
    },
  );
}
