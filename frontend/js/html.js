const app = document.getElementById("app");

export function tela(html) {
  app.innerHTML = html;
}

export function escapeHtml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
