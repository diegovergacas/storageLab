export const categoriasProduto = [
  ["REAGENTE_QUIMICA", "Reagente química"],
  ["CELULAS", "Células"],
  ["ESCRITORIO", "Escritório"],
  ["INFORMATICA", "Informática"],
  ["KITS_BIOLOGIA_MOLECULAR", "Kits de biologia molecular"],
  ["CONSUMIVEIS_LABORATORIO", "Consumíveis de laboratório"],
  ["EQUIPAMENTOS", "Equipamentos"],
  ["BIOSSEGURANCA_EPI", "Biossegurança / EPI"],
  ["OUTROS", "Outros"],
];

const nomes = Object.fromEntries(categoriasProduto);

export function opcoesCategoria() {
  return categoriasProduto.map(([codigo, nome]) => `<option value="${codigo}">${nome}</option>`).join("");
}

export function nomeCategoria(codigo) {
  return nomes[codigo === "REAGENTES" ? "REAGENTE_QUIMICA" : codigo] || nomes.OUTROS;
}
