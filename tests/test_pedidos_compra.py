import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.dominio.categorias import CATEGORIAS, normalizar_categoria, validar_categoria
from backend.persistencia.repositorio_json import RepositorioJson


class PedidosCompraTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path.cwd())
        self.addCleanup(self.temp.cleanup)
        pasta = Path(self.temp.name)
        with patch("backend.persistencia.repositorio_json.PLANILHA", pasta / "ausente.xlsx"):
            self.repo = RepositorioJson(
                pasta / "catalogo.json", pasta / "estoque.json", pasta / "fotos",
                pasta / "pedidos.json", pasta / "usuarios.json", pasta / "solicitacoes.json",
            )
        self.aluno = self.repo.usuario("aluno")
        self.tecnico = self.repo.usuario("tecnico")
        self.outro = self.repo.criar_usuario("Tecnico escritorio", "TECNICO")
        self.pedido = self.repo.criar_solicitacao(self.aluno, {"itens": [
            {"nome": "Alcool 70", "quantidade": 10, "unidade": "litros", "categoria_compra": "REAGENTE_QUIMICA"},
            {"nome": "Canetas", "quantidade": 2, "unidade": "caixas", "categoria_compra": "ESCRITORIO"},
        ]})
        self.quimico, self.escritorio = (item["id"] for item in self.pedido["itens"])

    def test_todos_veem_pendencias_e_tecnicos_dividem_compras(self):
        self.assertEqual(self.repo.pendencias_compra(self.tecnico)["total"], 2)
        self.assertEqual(self.repo.pendencias_compra(self.outro)["total"], 2)
        self.repo.assumir_compra(self.pedido["id"], self.quimico, self.tecnico)
        with self.assertRaisesRegex(ValueError, "Outro tecnico"):
            self.repo.assumir_compra(self.pedido["id"], self.quimico, self.outro)
        with self.assertRaisesRegex(ValueError, "Assuma"):
            self.repo.cadastrar_solicitacao(self.pedido["id"], self.outro, {"item_id": self.quimico})
        self.repo.assumir_compra(self.pedido["id"], self.escritorio, self.outro)
        self.repo.cadastrar_solicitacao(self.pedido["id"], self.tecnico, {"item_id": self.quimico, "marca": "Fornecedor", "data_compra": "2026-11-03"})
        self.assertEqual(self.repo.pendencias_compra(self.outro)["total"], 1)

    def test_categorias_e_compatibilidade_com_pedidos_antigos(self):
        self.assertEqual(len(CATEGORIAS), 9)
        for categoria in CATEGORIAS:
            self.assertEqual(validar_categoria(categoria), categoria)
        self.assertEqual(validar_categoria("REAGENTES"), "REAGENTE_QUIMICA")
        self.assertEqual(normalizar_categoria("REAGENTES"), "REAGENTE_QUIMICA")
        with self.assertRaisesRegex(ValueError, "Categoria"):
            validar_categoria("INEXISTENTE")
        pedido_antigo = {**self.pedido, "itens": [{**self.pedido["itens"][0], "categoria_compra": "REAGENTES"}]}
        self.assertEqual(self.repo._pedido_visivel(pedido_antigo)["itens"][0]["categoria_compra"], "REAGENTE_QUIMICA")

    def test_recebimento_exige_registro_e_excedente_exige_observacao(self):
        with self.assertRaisesRegex(ValueError, "registrar a compra"):
            self.repo.receber_solicitacao(self.pedido["id"], self.aluno, {"item_id": self.quimico, "quantidade_recebida": 7})
        self.repo.assumir_compra(self.pedido["id"], self.quimico, self.tecnico)
        self.repo.cadastrar_solicitacao(self.pedido["id"], self.tecnico, {"item_id": self.quimico, "marca": "Fornecedor", "data_compra": "2026-11-03"})
        self.repo.receber_solicitacao(self.pedido["id"], self.aluno, {"item_id": self.quimico, "quantidade_recebida": 7})
        with self.assertRaisesRegex(ValueError, "observacao"):
            self.repo.receber_solicitacao(self.pedido["id"], self.aluno, {"item_id": self.quimico, "quantidade_recebida": 5})
        pedido = self.repo.receber_solicitacao(self.pedido["id"], self.aluno, {
            "item_id": self.quimico, "quantidade_recebida": 5, "observacao": "Dois litros extras",
        })
        self.assertEqual(pedido["status"], "PARCIAL")
        self.assertEqual(pedido["itens"][0]["entregas"][-1]["excedente"], 2)
        self.assertTrue(pedido["itens"][0]["entregas"][-1]["alerta_tecnico_pendente"])
        self.assertEqual(self.repo.buscar(pedido["itens"][0]["codigo"])["prateleira"], 12)


if __name__ == "__main__":
    unittest.main()
