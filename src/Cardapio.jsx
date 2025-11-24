import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Plus, Minus, Utensils, MapPin, Phone, User, CreditCard, CheckCircle, ChevronRight } from 'lucide-react';
import { supabase } from './supabase';

// Formata moeda
const formatMoney = (value) => {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function Cardapio() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [carrinho, setCarrinho] = useState([]);
  const [isCarrinhoOpen, setIsCarrinhoOpen] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  // Dados do Cliente para Checkout
  const [cliente, setCliente] = useState({ nome: '', telefone: '', endereco: '', pagamento: 'Dinheiro', troco: '' });

  // Carregar produtos do Supabase
  useEffect(() => {
    buscarProdutos();
  }, []);

  async function buscarProdutos() {
    // Pega apenas produtos principais (não adicionais) para o menu
    const { data } = await supabase.from('produtos').select('*').eq('tipo', 'principal').order('categoria');
    if (data) {
      setProdutos(data);
      const cats = [...new Set(data.map(p => p.categoria || 'Geral'))];
      setCategorias(['Todos', ...cats]);
    }
  }

  // Adicionar ao carrinho
  const addAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item));
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1, produtoId: produto.id }]); // produtoId é importante para o Admin
    }
  };

  // Remover/Diminuir do carrinho
  const removeDoCarrinho = (id) => {
    const item = carrinho.find(i => i.id === id);
    if (item.qtd > 1) {
      setCarrinho(carrinho.map(i => i.id === id ? { ...i, qtd: i.qtd - 1 } : i));
    } else {
      setCarrinho(carrinho.filter(i => i.id !== id));
    }
  };

  // Calcular Total
  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

  // Enviar Pedido para o Supabase
  const finalizarPedido = async (e) => {
    e.preventDefault();
    if (carrinho.length === 0) return;

    const novoPedido = {
      cliente: { 
        nome: cliente.nome, 
        endereco: cliente.endereco, 
        telefone: cliente.telefone 
      },
      itens: carrinho.map(item => ({
        produtoId: item.id,
        nome: item.nome,
        qtd: item.qtd,
        preco: item.preco,
        opcaoSelecionada: item.opcoes ? item.opcoes.split(',')[0] : '', // Pega a primeira opção por padrão
        listaAdicionais: [] // Simplificação para o MVP
      })),
      taxa_entrega: 0, // Pode ser calculado depois ou fixo
      desconto: 0,
      pagamento: cliente.pagamento + (cliente.troco ? ` (Troco para ${cliente.troco})` : ''),
      observacoes: "Pedido via Cardápio Digital",
      total: totalCarrinho,
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Pendente",
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('pedidos').insert([novoPedido]);

    if (!error) {
      setPedidoEnviado(true);
      setCarrinho([]);
    } else {
      alert("Erro ao enviar pedido. Tente novamente.");
    }
  };

  if (pedidoEnviado) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle size={64} className="text-green-600 mb-4" />
        <h1 className="text-2xl font-bold text-green-800">Pedido Recebido!</h1>
        <p className="text-green-700 mt-2">Seu pedido já apareceu na nossa cozinha. Em breve ele sai para entrega!</p>
        <button onClick={() => setPedidoEnviado(false)} className="mt-8 bg-green-600 text-white px-6 py-3 rounded-full font-bold">Fazer outro pedido</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24">
      {/* HEADER */}
      <header className="bg-red-600 text-white p-6 shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-extrabold flex items-center gap-2"><Utensils className="text-yellow-400"/> BEST DOG</h1>
                <p className="text-red-100 text-sm">O melhor hot dog da cidade!</p>
            </div>
            {carrinho.length > 0 && (
                <button onClick={() => setIsCarrinhoOpen(true)} className="relative bg-white text-red-600 p-2 rounded-full shadow-md">
                    <ShoppingBag size={24} />
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-red-800 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                        {carrinho.reduce((acc, i) => acc + i.qtd, 0)}
                    </span>
                </button>
            )}
        </div>
      </header>

      {/* CATEGORIAS */}
      <div className="p-4 overflow-x-auto whitespace-nowrap bg-white shadow-sm mb-4">
        {categorias.map(cat => (
          <button 
            key={cat} 
            onClick={() => setCategoriaAtiva(cat)}
            className={`px-4 py-2 rounded-full mr-2 font-bold text-sm transition ${categoriaAtiva === cat ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="p-4 grid gap-4 md:grid-cols-2">
        {produtos.filter(p => categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva).map(prod => (
           <div key={prod.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{prod.nome}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2">{prod.opcoes || "Delicioso e feito na hora."}</p>
                  <div className="font-bold text-green-600 mt-2">{formatMoney(prod.preco)}</div>
              </div>
              <button onClick={() => addAoCarrinho(prod)} className="bg-red-100 text-red-600 p-3 rounded-full hover:bg-red-600 hover:text-white transition">
                  <Plus size={20} />
              </button>
           </div>
        ))}
      </div>

      {/* BOTÃO FLUTUANTE VER SACOLA (SÓ MOBILE) */}
      {carrinho.length > 0 && !isCarrinhoOpen && (
          <div className="fixed bottom-4 left-4 right-4 z-20">
              <button onClick={() => setIsCarrinhoOpen(true)} className="w-full bg-red-600 text-white p-4 rounded-xl shadow-xl flex justify-between items-center font-bold">
                  <div className="flex items-center gap-2">
                      <span className="bg-white text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">{carrinho.length}</span>
                      <span>Ver Sacola</span>
                  </div>
                  <span>{formatMoney(totalCarrinho)}</span>
              </button>
          </div>
      )}

      {/* MODAL CARRINHO / CHECKOUT */}
      {isCarrinhoOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
           <div className="bg-white w-full md:w-[400px] h-full flex flex-col animate-fade-in-right">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                  <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingBag size={20}/> Sua Sacola</h2>
                  <button onClick={() => setIsCarrinhoOpen(false)} className="p-2 bg-gray-200 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                  {carrinho.length === 0 ? (
                      <div className="text-center text-gray-400 mt-10">Sua sacola está vazia.</div>
                  ) : (
                      <div className="space-y-4">
                          {carrinho.map(item => (
                              <div key={item.id} className="flex justify-between items-center border-b pb-4">
                                  <div>
                                      <div className="font-bold">{item.nome}</div>
                                      <div className="text-green-600 text-sm font-bold">{formatMoney(item.preco)}</div>
                                  </div>
                                  <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                                      <button onClick={() => removeDoCarrinho(item.id)} className="p-1 bg-white rounded shadow-sm"><Minus size={14}/></button>
                                      <span className="text-sm font-bold w-4 text-center">{item.qtd}</span>
                                      <button onClick={() => addAoCarrinho(item)} className="p-1 bg-white rounded shadow-sm"><Plus size={14}/></button>
                                  </div>
                              </div>
                          ))}
                          
                          <div className="pt-4 mt-4 bg-gray-50 p-4 rounded-lg space-y-4">
                              <h3 className="font-bold text-gray-700 border-b pb-2">Finalizar Pedido</h3>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><User size={14}/> Seu Nome</label>
                                  <input type="text" className="w-full border rounded p-2 mt-1" placeholder="Ex: João Silva" value={cliente.nome} onChange={e => setCliente({...cliente, nome: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Phone size={14}/> WhatsApp / Telefone</label>
                                  <input type="text" className="w-full border rounded p-2 mt-1" placeholder="(11) 99999-9999" value={cliente.telefone} onChange={e => setCliente({...cliente, telefone: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><MapPin size={14}/> Endereço de Entrega</label>
                                  <input type="text" className="w-full border rounded p-2 mt-1" placeholder="Rua, Número, Bairro..." value={cliente.endereco} onChange={e => setCliente({...cliente, endereco: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><CreditCard size={14}/> Pagamento na Entrega</label>
                                  <select className="w-full border rounded p-2 mt-1 bg-white" value={cliente.pagamento} onChange={e => setCliente({...cliente, pagamento: e.target.value})}>
                                      <option>Dinheiro</option>
                                      <option>PIX</option>
                                      <option>Cartão de Crédito</option>
                                      <option>Cartão de Débito</option>
                                  </select>
                              </div>
                              {cliente.pagamento === 'Dinheiro' && (
                                  <div>
                                      <label className="text-xs font-bold text-gray-500">Precisa de troco para?</label>
                                      <input type="text" className="w-full border rounded p-2 mt-1" placeholder="Ex: 50,00" value={cliente.troco} onChange={e => setCliente({...cliente, troco: e.target.value})} />
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              <div className="p-4 border-t bg-white">
                  <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-500">Total do Pedido</span>
                      <span className="text-2xl font-extrabold text-gray-800">{formatMoney(totalCarrinho)}</span>
                  </div>
                  <button 
                    onClick={finalizarPedido} 
                    disabled={carrinho.length === 0 || !cliente.nome || !cliente.endereco}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
                  >
                    Enviar Pedido <ChevronRight />
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}