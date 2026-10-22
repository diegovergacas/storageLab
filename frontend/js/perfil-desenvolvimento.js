const botoes = [...document.querySelectorAll("[data-perfil]")];
const conteudoGestao = document.querySelector("#gestao-conteudo");
const acessoAluno = document.querySelector("#acesso-aluno");

async function iniciar() {
  try {
    const resposta = await fetch("/api/usuarios");
    const { usuarios } = await resposta.json();
    const selecionar = (perfil) => {
      const usuario = usuarios.find((item) => item.perfil === perfil);
      if (!usuario) return;
      localStorage.setItem("storagelab-usuario", usuario.id);
      botoes.forEach((botao) => botao.classList.toggle("ativo", botao.dataset.perfil === perfil));
      if (conteudoGestao && acessoAluno) {
        const aluno = perfil === "ALUNO";
        conteudoGestao.hidden = aluno;
        acessoAluno.hidden = !aluno;
      }
    };
    const atual = usuarios.find((item) => item.id === localStorage.getItem("storagelab-usuario"));
    selecionar(atual?.perfil || "ALUNO");
    botoes.forEach((botao) => { botao.onclick = () => selecionar(botao.dataset.perfil); });
  } catch {
    // A gestão continua disponível se os perfis não puderem ser carregados.
  }
}

iniciar();
