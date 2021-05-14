const {addBusinessDays} = require('date-fns');
const { id } = require('date-fns/locale');
const produtos = require('../dados/data.json');

const listaProdutos = produtos.produtos;
const emEstoque = listaProdutos.filter(x => x.estoque > 0);

let carrinho = {
    "produtos": [],
    "subtotal": 0,
    "dataDeEntrega": null,
    "valorDoFrete": 0,
    "totalAPagar": 0
}

function listarProdutos (req, res) {
    const categoria = req.query.categoria;
    const precoInicial = req.query.precoInicial;
    const precoFinal = req.query.precoFinal;
    
    const filtraPorCategoria = emEstoque.filter(x => x.categoria.toLowerCase() === categoria);
    const filtraPorPreco = emEstoque.filter(x => x.preco >= Number(precoInicial) && x.preco <= Number(precoFinal));
    const filtraPorPrecoECategoria = filtraPorCategoria.filter(x => x.preco >= Number(precoInicial) && x.preco <= Number(precoFinal))

    if (!categoria && !precoInicial && !precoFinal) {
        res.json(emEstoque);
        return;
    }

    if (categoria && precoInicial && precoFinal) {
        res.json(filtraPorPrecoECategoria);
        return;
    }
    
    if (categoria) {
        res.json(filtraPorCategoria);
        return;
    }

    if (precoInicial && precoFinal) {
        res.json(filtraPorPreco);
        return;
    }
};

function retornaInformacoesCarrinho(req, res) {
    res.json(carrinho);
}

function adicionaProdutoAoCarrinho(req, res) {
    const idAdicionado = req.body.id;
    const quantidadeAdicionada = req.body.quantidade;
    
    const buscaProduto = listaProdutos.find(x => x.id === idAdicionado);
    
    if (!buscaProduto && typeof idAdicionado === 'number' && typeof quantidadeAdicionada === 'number') {
        res.status(404);
        res.json({mensagem: `Não existe produto com o ID ${idAdicionado}.`})
        return;
    }

    if (typeof idAdicionado !== 'number' || typeof quantidadeAdicionada !== 'number') {
        res.status(400);
        res.json({mensagem: "Os campos 'id' e 'quantidade' devem ser preenchidos com números."});
        return;
    }

    if (buscaProduto.estoque === 0) {
        res.status(400);
        res.json({mensagem: "Esse produto está fora de estoque."});
        return;
    }

    if (carrinho.produtos.includes(buscaProduto)) {
        res.status(400);
        res.json({mensagem: "Esse produto já foi adicionado ao carrinho."})
        return;
    }

    carrinho.produtos.push(buscaProduto);
    
    buscaProduto.quantidade = 0;
    buscaProduto.quantidade += quantidadeAdicionada;
    
    carrinho.subtotal += buscaProduto.preco * quantidadeAdicionada;
    carrinho.dataDeEntrega = addBusinessDays(new Date(), 15);

    if (carrinho.subtotal <= 20000) {
        carrinho.valorDoFrete = 5000;
    } else {
        carrinho.valorDoFrete = 0;
    }

    carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
    
    res.json(carrinho);
}

function alteraQuantidade(req, res) {
    const quantidadeASerAlterada = req.body.quantidade;
    const idProduto = req.params.idProduto; 
    const encontraItemNoCarrinho = carrinho.produtos.find(x => x.id === Number(idProduto));
    const passaValorParaPositivo = Math.abs(quantidadeASerAlterada);
    
    if (!encontraItemNoCarrinho) {
        res.json({mensagem: `O carrinho não possui nenhum produto com o ID (${idProduto}) informado.`});
        return;
    }

    if ((quantidadeASerAlterada + encontraItemNoCarrinho.quantidade) > encontraItemNoCarrinho.estoque) {
        if (encontraItemNoCarrinho.estoque - encontraItemNoCarrinho.quantidade === 0) {
            res.json({mensagem: `Não foi possível processar o pedido. Não há mais unidades desse produto em estoque.`});
            return;
        }
        res.json({mensagem: `Não foi possível processar o pedido. Só há mais ${encontraItemNoCarrinho.estoque - encontraItemNoCarrinho.quantidade} unidade(s) do produto em estoque.`});
        return;
    }

    if (quantidadeASerAlterada < 0 && passaValorParaPositivo > encontraItemNoCarrinho.quantidade) {
        res.json({mensagem: `Não foi possível processar o pedido. A quantidade do item no carrinho é menor do que a solicitada.`});
        return;
    }

    if (encontraItemNoCarrinho && quantidadeASerAlterada > 0) {
        encontraItemNoCarrinho.quantidade += quantidadeASerAlterada;
        carrinho.subtotal += quantidadeASerAlterada * encontraItemNoCarrinho.preco;
        carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
        res.json(carrinho);
        return;
    }
   
    if (encontraItemNoCarrinho && quantidadeASerAlterada < 0) {
        encontraItemNoCarrinho.quantidade -= passaValorParaPositivo;
        carrinho.subtotal -= passaValorParaPositivo * encontraItemNoCarrinho.preco;
        carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
        res.json(carrinho);
        return;
    }
}

function verificaERemoveItem(req, res) {
    const idProduto = req.params.idProduto;
    const taNoCarrinho = carrinho.produtos.find(x => x.id === Number(idProduto));
    const indice = carrinho.produtos.indexOf(taNoCarrinho);
    
    if (!taNoCarrinho) {
        res.json({mensagem: `O carrinho não possui nenhum produto com o ID (${idProduto}) informado.`});
        return;
    }

    carrinho.produtos.splice(indice, 1);
    atualizaValorTotal();
    res.json(taNoCarrinho);
}

function limpaCarrinho(req, res) {
    carrinho.produtos.length = 0;
    carrinho.subtotal = 0;
    carrinho.dataDeEntrega = null;
    carrinho.valorDoFrete = 0;
    carrinho.totalAPagar = 0;
    res.json({mensagem: "A operação foi concluída com sucesso. O carrinho está limpo."});
}

function atualizaValorTotal() {
    for (let i of carrinho.produtos) {
        carrinho.subtotal = 0;
        carrinho.subtotal += i.quantidade * i.preco;
        carrinho.totalAPagar = 0;
        carrinho.totalAPagar = carrinho.subtotal + carrinho.valorDoFrete;
    } 

    if (carrinho.produtos.length === 0) {
        carrinho.subtotal = 0;
        carrinho.dataDeEntrega = null;
        carrinho.valorDoFrete = 0;
        carrinho.totalAPagar = 0;
    } 
}

function finalizaCompra(req, res) {
    const type = req.body.type;
    const country = req.body.country;
    const name = req.body.name;
    const documents = req.body.documents;
    const cpf = req.body.cpf;
    const number = req.body.number;

    if (!req.body) {
        res.status(400);
        res.json({mensagem: "Os dados do cliente devem ser informados."});
        return;
    }

    if (carrinho.produtos.length === 0) {
        res.status(400);
        res.json({mensagem: "Não é possível finalizar a compra, pois não há produtos no carrinho."});
        return; 
    }

    if (!type) {
        res.json({mensagem: "O campo 'type' é obrigatório."});
        return;
    }

    if (!country) {
        res.json({mensagem: "O campo 'country' é obrigatório."});
        return;
    }

    if (!name) {
        res.json({mensagem: "O campo 'name' é obrigatório."});
        return;
    }

    if (!documents) {
        res.json({mensagem: "O campo 'documents' é obrigatório."});
        return;
    }

    if (country.length !== 2) {
        res.status(400);
        res.json({mensagem: "O campo 'country' deve ser preenchido somente com 2 dígitos."});
        return;
    }

    if (type !== "individual") {
        res.status(400);
        res.json({mensagem: "O campo 'type' deve ser 'individual'. Somente serão atendidas pessoas físicas."});
        return;
    }

    if (!name.includes(' ')) {
        res.status(400);
        res.json({mensagem: "O campo 'name' deve conter, pelo menos, nome e sobrenome."});
        return;
    }

    for (let i of documents) {
        if (isNaN(i.number)) {
            res.status(400);
            res.json({mensagem: "O 'cpf' deve conter apenas números."});
            return;
        }
        
        if (i.number.length < 11 || i.number.length > 11) {
            res.status(400);
            res.json({mensagem: "O 'cpf' deve conter 11 dígitos."});
            return;
        }
    }

    for (let i of listaProdutos) {
        for (let j of carrinho.produtos) {
            if (i.nome === j.nome) {
                i.estoque -= j.quantidade;
            };
        }
    }

    res.status(200);
    res.json({
        mensagem: "Sua compra foi concluída com sucesso!",
        carrinho
    });

    carrinho.produtos.length = 0;
    carrinho.subtotal = 0;
    carrinho.dataDeEntrega = null;
    carrinho.valorDoFrete = 0;
    carrinho.totalAPagar = 0;
}

module.exports = {
    listarProdutos,
    retornaInformacoesCarrinho,
    adicionaProdutoAoCarrinho,
    alteraQuantidade,
    verificaERemoveItem,
    limpaCarrinho,
    finalizaCompra,
}