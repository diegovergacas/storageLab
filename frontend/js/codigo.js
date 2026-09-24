export function compactar(codigo) {
  return String(codigo || "").replace(/\s+/g, "").trim();
}

export function soDigitos(codigo) {
  return compactar(codigo).replace(/\D/g, "");
}

export function checksumGs1(digitos) {
  if (!/^\d{8}$|^\d{12,14}$/.test(digitos)) {
    return false;
  }
  const corpo = digitos.slice(0, -1);
  let total = 0;
  for (let i = 0; i < corpo.length; i += 1) {
    const n = Number(corpo[corpo.length - 1 - i]);
    total += n * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (total % 10)) % 10 === Number(digitos.at(-1));
}

export function codigoChave(codigo) {
  const bruto = compactar(codigo);
  if (bruto.includes("://")) {
    return bruto;
  }
  const digitos = soDigitos(bruto);
  if (digitos.length === 12 && checksumGs1(digitos)) {
    return `0${digitos}`;
  }
  if ([8, 13, 14].includes(digitos.length) && checksumGs1(digitos)) {
    return digitos;
  }
  return bruto;
}

export function leituraValida(codigo, formato) {
  const chave = codigoChave(codigo);
  if (!chave) {
    return "";
  }
  const tipo = String(formato || "").toLowerCase();
  const digitos = soDigitos(chave);
  const pareceEan =
    tipo.includes("ean") ||
    tipo.includes("upc") ||
    /^\d{8}$|^\d{12,14}$/.test(digitos);
  if (pareceEan && !checksumGs1(digitos)) {
    return "";
  }
  return chave;
}
