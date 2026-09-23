export async function api(caminho, opcoes) {
  const resposta = await fetch(caminho, opcoes);
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.detail || "Falha na requisicao");
  }
  return resposta.json();
}
