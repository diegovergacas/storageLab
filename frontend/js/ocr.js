const MARCAS = [
  "merck",
  "sigma",
  "synth",
  "vetec",
  "qhemis",
  "dinâmica",
  "dinamica",
  "neon",
  "exodo",
];

export function sugerirCampos(texto) {
  const linhas = texto
    .split(/\n+/)
    .map((linha) => linha.replace(/\s+/g, " ").trim())
    .filter((linha) => linha.length > 2 && !/^\d[\d\s-]+$/.test(linha));

  const marcaLinha = linhas.find((linha) =>
    MARCAS.some((marca) => linha.toLowerCase().includes(marca)),
  );

  return {
    nome: linhas[0] || "",
    marca: marcaLinha || "",
  };
}

export async function lerRotulo(arquivo) {
  const resultado = await Tesseract.recognize(arquivo, "por+eng");
  return sugerirCampos(resultado.data.text || "");
}
