const express = require('express');
const produtos = require('./controladores/checkout');

const rotas = express();

rotas.get('/produtos', produtos.listarProdutos);
rotas.get('/carrinho', produtos.retornaInformacoesCarrinho);
rotas.post('/carrinho/produtos', produtos.adicionaProdutoAoCarrinho);
rotas.patch('/carrinho/produtos/:idProduto', produtos.alteraQuantidade);
rotas.delete('/carrinho/produtos/:idProduto', produtos.verificaERemoveItem);
rotas.delete('/carrinho', produtos.limpaCarrinho);
rotas.post('/finalizar-compra', produtos.finalizaCompra);


module.exports = rotas;