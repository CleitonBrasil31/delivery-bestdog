import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Plus, Minus, Utensils, MapPin, Phone, User, CreditCard, CheckCircle, ChevronRight, Clock, Info, List } from 'lucide-react';
import { supabase } from './supabase';

// Formatação de Moeda
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
  const [loading, setLoading] = useState(true);
  const [taxasFrete, setTaxasFrete] = useState([]);

  // Dados do Cliente
  const [cliente, setCliente] = useState({ 
    nome: '', 
    telefone: '', 
    endereco: '', 
    pagamento: 'Dinheiro', 
    troco: '', 
    observacoes: '',
    taxaEntregaSelecionada: 0 
  });

  // Carregar dados do Banco
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Busca Produtos Principais
      const { data: prodData } = await supabase
        .from('produtos')
        .select('*')
        .eq('tipo', 'principal') 
        .order('nome');
      
      if (prodData) {
        setProdutos(prodData);
        // Extrai categorias únicas
        const cats = ['Todos', ...new Set(prodData.map(p => p.categoria || 'Geral'))];
        setCategorias(cats);
      }

      // 2. Busca Taxas de Frete (para o cliente ter noção, ou selecionar bairro)
      const { data: taxaData } = await supabase.from('taxas').select('*').order('valor');
      if(taxaData) setTaxasFrete(taxaData);

      setLoading(false);
    };
    fetchData();
  }, []);

  // Lógica do Carrinho
  const addAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item));
    } else {
      setCarrinho([...carrinho, { ...produto, qtd: 1, produtoId: produto.id }]);
    }
    setIsCarrinhoOpen(true);
  };

  const removeDoCarrinho = (id) => {
    const item = carrinho.find(i => i.id === id);
    if (item.qtd > 1) {
      setCarrinho(carrinho.map(i => i.id === id ? { ...i, qtd: i.qtd - 1 } : i));
    } else {
      setCarrinho(carrinho.filter(i => i.id !== id));
    }
  };

  // Totais
  const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
  const totalFinal = subtotal + Number(cliente.taxaEntregaSelecionada);

  // Enviar Pedido
  const finalizarPedido = async () => {
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
        // Pega a primeira opção como padrão se houver, para simplificar o MVP
        opcaoSelecionada: item.opcoes ? item.opcoes.split(',')[0].trim() : '', 
        listaAdicionais: [] 
      })),
      taxa_entrega: Number(cliente.taxaEntregaSelecionada), 
      desconto: 0,
      pagamento: cliente.pagamento + (cliente.troco ? ` (Troco para ${cliente.troco})` : ''),
      observacoes: cliente.observacoes || "Via Cardápio Digital",
      total: totalFinal,
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Pendente",
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('pedidos').insert([novoPedido]);

    if (!error) {
      setPedidoEnviado(true);
      setCarrinho([]);
      window.scrollTo(0, 0);
    } else {
      alert("Erro de conexão. Tente novamente.");
    }
  };

  // Tela de Sucesso
  if (pedidoEnviado) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="bg-white p-8 rounded-full shadow-lg mb-6">
            <CheckCircle size={80} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-green-800 mb-2">Pedido Recebido!</h1>
        <p className="text-green-700 mb-8 text-lg">A cozinha já começou a preparar. <br/>Aguarde nosso contato!</p>
        <button onClick={() => setPedidoEnviado(false)} className="bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-green-700 transition">Fazer outro pedido</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-32">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-6 pb-12 shadow-lg rounded-b-3xl relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-black flex items-center gap-2 italic tracking-tighter">
                    <Utensils className="text-yellow-400" strokeWidth={3}/> BEST DOG
                </h1>
                <p className="text-red-100 text-sm mt-1 opacity-90 font-medium">Sabor que mata a sua fome!</p>
                <div className="flex items-center gap-2 mt-4 bg-black/20 backdrop-blur-sm w-fit px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div> Aberto agora
                </div>
            </div>
            {carrinho.length > 0 && (
                <button onClick={() => setIsCarrinhoOpen(true)} className="relative bg-white text-red-600 p-3 rounded-full shadow-xl hover:scale-105 transition active:scale-95">
                    <ShoppingBag size={24} />
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-red-900 text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full border-2 border-red-600">
                        {carrinho.reduce((acc, i) => acc + i.qtd, 0)}
                    </span>
                </button>
            )}
        </div>
        {/* Decoracao de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      </div>

      {/* BARRA DE CATEGORIAS */}
      <div className="px-4 -mt-6 sticky top-0 z-20 pb-2">
        <div className="bg-white p-2 rounded-xl shadow-lg shadow-gray-200/50 flex overflow-x-auto gap-2 no-scrollbar ring-1 ring-black/5">
            {categorias.map(cat => (
            <button 
                key={cat} 
                onClick={() => setCategoriaAtiva(cat)}
                className={`px-5 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-300 ${categoriaAtiva === cat ? 'bg-gray-900 text-white shadow-md scale-105' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
                {cat}
            </button>
            ))}
        </div>
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
            <div className="text-center text-gray-400 py-20 col-span-full flex flex-col items-center">
                <Clock className="animate-spin mb-2 text-red-500"/> Carregando delícias...
            </div>
        ) : (
            produtos.filter(p => categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva).map(prod => (
            <div key={prod.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-lg transition-shadow group">
                <div className="w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative">
                    {prod.imagem_url ? (
                        <img src={prod.imagem_url} alt={prod.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                        <Utensils className="text-gray-300" size={32} />
                    )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight line-clamp-1">{prod.nome}</h3>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                            {prod.descricao || prod.opcoes || "Ingredientes selecionados."}
                        </p>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <span className="font-black text-xl text-gray-900">{formatMoney(prod.preco)}</span>
                        <button onClick={() => addAoCarrinho(prod)} className="bg-red-50 text-red-600 p-2 rounded-xl hover:bg-red-600 hover:text-white transition active:scale-95 font-bold text-xs flex items-center gap-1 shadow-sm">
                            ADD <Plus size={16} strokeWidth={3}/>
                        </button>
                    </div>
                </div>
            </div>
            ))
        )}
        {produtos.length === 0 && !loading && <div className="text-center text-gray-400 py-10 col-span-full">Nenhum produto disponível.</div>}
      </div>

          {/* BOTÃO FLUTUANTE "VER SACOLA" */}
          {carrinho.length > 0 && !isCarrinhoOpen && (
              <div className="fixed bottom-6 left-4 right-4 z-20 animate-bounce-up">
                  <button onClick={() => setIsCarrinhoOpen(true)} className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center font-bold border-b-4 border-gray-700 active:border-b-0 active:translate-y-1 transition-all">
                      <div className="flex items-center gap-3">
                          <div className="bg-red-500 w-8 h-8 rounded-full flex items-center justify-center text-sm animate-pulse">{carrinho.length}</div>
                          <span>Ver Sacola</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="opacity-90 text-sm mr-1">Total:</span>
                        <span className="text-xl">{formatMoney(totalFinal)}</span>
                        <ChevronRight size={20} />
                      </div>
                  </button>
              </div>
          )}
    
          {/* MODAL SACOLA (CHECKOUT) */}
          {isCarrinhoOpen && (
              <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm transition-opacity">
                 <div className="bg-white w-full md:w-[450px] h-full flex flex-col shadow-2xl animate-slide-in">
                    <div className="p-5 bg-white border-b flex justify-between items-center shadow-sm z-10">
                        <h2 className="font-black text-xl flex items-center gap-2 text-gray-800"><ShoppingBag className="text-red-600"/> Sacola</h2>
                        <button onClick={() => setIsCarrinhoOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                        {carrinho.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <ShoppingBag size={64} className="mb-4 opacity-20"/>
                                <p>Sua sacola está vazia.</p>
                                <button onClick={() => setIsCarrinhoOpen(false)} className="mt-4 text-red-600 font-bold hover:underline">Voltar ao cardápio</button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* ITENS */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2 text-sm"><List size={16}/> Resumo do Pedido</h3>
                                    {carrinho.map(item => (
                                        <div key={item.id} className="flex justify-between items-center mb-4 last:mb-0">
                                            <div className="flex-1 pr-2">
                                                <div className="font-bold text-gray-800 leading-tight">{item.nome}</div>
                                                <div className="text-green-600 text-sm font-bold mt-1">{formatMoney(item.preco)}</div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                                <button onClick={() => removeDoCarrinho(item.id)} className="w-8 h-8 bg-white rounded shadow-sm text-gray-600 flex items-center justify-center active:scale-90 transition"><Minus size={14}/></button>
                                                <span className="text-sm font-bold w-4 text-center">{item.qtd}</span>
                                                <button onClick={() => addAoCarrinho(item)} className="w-8 h-8 bg-white rounded shadow-sm text-green-600 flex items-center justify-center active:scale-90 transition"><Plus size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* DADOS CLIENTE */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2 text-sm"><User size={16}/> Seus Dados</h3>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome Completo</label>
                                        <input type="text" className="w-full border border-gray-300 rounded-lg p-3 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition bg-gray-50" placeholder="Ex: João da Silva" value={cliente.nome} onChange={e => setCliente({...cliente, nome: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">WhatsApp / Telefone</label>
                                        <input type="tel" className="w-full border border-gray-300 rounded-lg p-3 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition bg-gray-50" placeholder="(XX) 9XXXX-XXXX" value={cliente.telefone} onChange={e => setCliente({...cliente, telefone: e.target.value})} />
                                    </div>
                                </div>
    
                                {/* ENTREGA */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2 text-sm"><MapPin size={16}/> Entrega</h3>
                                    
                                    {/* SELEÇÃO DE FRETE - Busca do Banco de Dados */}
                                    {taxasFrete.length > 0 && (
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Selecione seu Bairro/Região</label>
                                          <select 
                                              className="w-full border border-gray-300 rounded-lg p-3 bg-white text-gray-700 font-medium mb-3"
                                              onChange={(e) => setCliente({...cliente, taxaEntregaSelecionada: Number(e.target.value)})}
                                              value={cliente.taxaEntregaSelecionada}
                                          >
                                              <option value="0">Retirar no Balcão / Sem Frete</option>
                                              {taxasFrete.map(taxa => (
                                                  <option key={taxa.id} value={taxa.valor}>{taxa.nome} - {formatMoney(taxa.valor)}</option>
                                              ))}
                                          </select>
                                      </div>
                                    )}
    
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Endereço Completo</label>
                                        <textarea rows="2" className="w-full border border-gray-300 rounded-lg p-3 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition bg-gray-50" placeholder="Rua, Número, Bairro e Referência..." value={cliente.endereco} onChange={e => setCliente({...cliente, endereco: e.target.value})} />
                                    </div>
                                </div>
    
                                {/* PAGAMENTO */}
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2 text-sm"><CreditCard size={16}/> Pagamento</h3>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Forma de Pagamento</label>
                                        <select className="w-full border border-gray-300 rounded-lg p-3 bg-white font-bold text-gray-700" value={cliente.pagamento} onChange={e => setCliente({...cliente, pagamento: e.target.value})}>
                                            <option>Dinheiro</option>
                                            <option>PIX</option>
                                            <option>Cartão de Crédito</option>
                                            <option>Cartão de Débito</option>
                                        </select>
                                    </div>
                                    {cliente.pagamento === 'Dinheiro' && (
                                        <div className="animate-fade-in bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                            <label className="text-xs font-bold text-yellow-800 uppercase mb-1 block">Troco para quanto?</label>
                                            <input type="text" className="w-full border border-yellow-300 rounded p-2 focus:outline-none font-bold text-gray-800" placeholder="Ex: R$ 50,00" value={cliente.troco} onChange={e => setCliente({...cliente, troco: e.target.value})} />
                                        </div>
                                    )}
                                     <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Observações (Opcional)</label>
                                        <input type="text" className="w-full border border-gray-300 rounded-lg p-3" placeholder="Ex: Sem cebola, campainha quebrada..." value={cliente.observacoes} onChange={e => setCliente({...cliente, observacoes: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
    
                    {/* TOTAL E BOTÃO FINAL */}
                    <div className="p-5 border-t bg-white z-10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Subtotal</span>
                            <span className="font-bold">{formatMoney(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Taxa de Entrega</span>
                            <span className="font-bold">{formatMoney(Number(cliente.taxaEntregaSelecionada))}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-500">Total</span>
                            <span className="font-black text-xl">{formatMoney(totalFinal)}</span>
                        </div>
    
                        <button onClick={finalizarPedido} className="w-full bg-green-600 text-white p-3 rounded-xl font-bold shadow hover:bg-green-700 transition">Finalizar Pedido</button>
                        <button onClick={() => setIsCarrinhoOpen(false)} className="w-full mt-3 text-center text-gray-600">Continuar Comprando</button>
                    </div>
                 </div>
              </div>
          )}
        </div>
      );
    }