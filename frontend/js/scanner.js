import { estado } from "./estado.js";

export async function pararLeitor() {
  if (!estado.leitor) {
    return;
  }
  try {
    await estado.leitor.stop();
  } catch {
    /* camera ja fechada */
  }
  estado.leitor = null;
}

export async function iniciarScanner(aoLer, aoFalhar) {
  estado.leitor = new Html5Qrcode("reader");
  try {
    await estado.leitor.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 230, height: 140 } },
      async (texto, resultado) => {
        const tipo = resultado?.result?.format?.formatName || "codigo";
        await pararLeitor();
        aoLer(texto, tipo);
      },
    );
  } catch {
    await pararLeitor();
    aoFalhar();
  }
}
