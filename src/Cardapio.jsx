import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Plus, Minus, Utensils, MapPin, Phone, User, CreditCard, CheckCircle, ChevronRight, Clock } from 'lucide-react';
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

  // Dados do Cliente
  const [cliente, setCliente] = useState({ nome: '', telefone: '', endereco: '', pagamento: 'Dinheiro', troco: '', observacoes: '' });

  // Carregar produtos do Banco
  useEffect(() => {
    const fetchProdutos = async () => {
      setLoading(true);
      // Busca apenas itens principais (Lanches, Bebidas, Combos, etc)
      const { data } = await supabase
        .from('produtos')
        .select('*')
        .in('tipo', ['principal']) 
        .order('nome');
      
      if (data) {
        setProdutos(data);
        // Cria lista única de categorias
        const cats = ['Todos', ...new Set(data.map(p => p.categoria || 'Geral'))];
        setCategorias(cats);
      }
      setLoading(false);
    };
    fetchProdutos();
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

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);

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
        opcaoSelecionada: item.opcoes ? item.opcoes.split(',')[0].trim() : '', 
        listaAdicionais: [] 
      })),
      taxa_entrega: 0, // Será definida pelo Admin ao receber
      desconto: 0,
      pagamento: cliente.pagamento + (cliente.troco ? ` (Troco para ${cliente.troco})` : ''),
      observacoes: cliente.observacoes || "Pedido via App",
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
      window.scrollTo(0, 0);
    } else {
      alert("Erro ao enviar pedido. Verifique sua conexão.");
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
        <p className="text-green-700 mb-8 text-lg">A cozinha já começou a preparar seu Best Dog. <br/>Fique de olho no seu WhatsApp!</p>
        <button onClick={() => setPedidoEnviado(false)} className="bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-green-700 transition">Fazer outro pedido</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-32">
      {/* HEADER HERO */}
      {/* ... dentro do return ... */}
<header className="bg-red-600 text-white p-6 shadow-lg sticky top-0 z-10">
  <div className="flex justify-between items-center">
      <div>
          {/* SUBSTITUA O LINK ABAIXO PELO LINK DA SUA LOGO */}
          <img 
            src="https://zzywoanycsvxgoxhvzyf.supabase.co/storage/v1/object/public/imagens/icon.png" 
            alt="Best Dog Logo" 
            className="h-12 w-auto object-contain mb-1" // Ajuste h-12 para aumentar/diminuir
          />
          <p className="text-red-100 text-sm opacity-90">O Hot Dog que você respeita.</p>
      </div>
      
      {/* ... botão do carrinho continua aqui ... */}

      {/* BARRA DE CATEGORIAS */}
      <div className="px-4 -mt-6">
        <div className="bg-white p-2 rounded-xl shadow-md flex overflow-x-auto gap-2 no-scrollbar">
            {categorias.map(cat => (
            <button 
                key={cat} 
                onClick={() => setCategoriaAtiva(cat)}
                className={`px-5 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${categoriaAtiva === cat ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
                {cat}
            </button>
            ))}
        </div>
      </div>

      {/* LISTA DE PRODUTOS */}
      <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
            <div className="text-center text-gray-400 py-10 col-span-full">Carregando cardápio...</div>
        ) : (
            produtos.filter(p => categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva).map(prod => (
            <div key={prod.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition">
                {/* Se tiver imagem no futuro, ela iria aqui */}
                <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    {prod.imagem_url ? (
                        <img src={prod.imagem_url} alt={prod.nome} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                        <Utensils className="text-gray-300" size={32} />
                    )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{prod.nome}</h3>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                            {prod.descricao || prod.opcoes || "Ingredientes selecionados e muito sabor."}
                        </p>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <span className="font-extrabold text-lg text-green-700">{formatMoney(prod.preco)}</span>
                        <button onClick={() => addAoCarrinho(prod)} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-600 hover:text-white transition font-bold text-xs flex items-center gap-1">
                            ADICIONAR <Plus size={14} />
                        </button>
                    </div>
                </div>
            </div>
            ))
        )}
        {produtos.length === 0 && !loading && <div className="text-center text-gray-400 py-10 col-span-full">Nenhum produto disponível.</div>}
      </div>

      {/* BARRA FIXA INFERIOR (VER SACOLA) */}
      {carrinho.length > 0 && !isCarrinhoOpen && (
          <div className="fixed bottom-6 left-4 right-4 z-20 animate-bounce-up">
              <button onClick={() => setIsCarrinhoOpen(true)} className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center font-bold border-b-4 border-gray-700 active:border-b-0 active:translate-y-1 transition-all">
                  <div className="flex items-center gap-3">
                      <div className="bg-red-500 w-8 h-8 rounded-full flex items-center justify-center text-sm">{carrinho.length}</div>
                      <span>Ver Sacola</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatMoney(totalCarrinho)}</span>
                    <ChevronRight size={20} />
                  </div>
              </button>
          </div>
      )}

      {/* MODAL / DRAWER DO CARRINHO */}
      {isCarrinhoOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-sm transition-opacity">
           <div className="bg-white w-full md:w-[450px] h-full flex flex-col shadow-2xl animate-slide-in">
              <div className="p-5 bg-white border-b flex justify-between items-center shadow-sm z-10">
                  <h2 className="font-black text-xl flex items-center gap-2 text-gray-800"><ShoppingBag className="text-red-600"/> Sacola</h2>
                  <button onClick={() => setIsCarrinhoOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                  {carrinho.length === 0 ? (
                      <div className="text-center text-gray-400 mt-20">Sua sacola está vazia.</div>
                  ) : (
                      <div className="space-y-6">
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                              <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Itens do Pedido</h3>
                              {carrinho.map(item => (
                                  <div key={item.id} className="flex justify-between items-center mb-4 last:mb-0">
                                      <div>
                                          <div className="font-bold text-gray-800">{item.nome}</div>
                                          <div className="text-green-600 text-sm font-bold">{formatMoney(item.preco)}</div>
                                      </div>
                                      <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                                          <button onClick={() => removeDoCarrinho(item.id)} className="w-8 h-8 bg-white rounded shadow text-gray-600 flex items-center justify-center active:bg-gray-200"><Minus size={16}/></button>
                                          <span className="text-sm font-bold w-4 text-center">{item.qtd}</span>
                                          <button onClick={() => addAoCarrinho(item)} className="w-8 h-8 bg-white rounded shadow text-green-600 flex items-center justify-center active:bg-gray-200"><Plus size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                              <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><User size={18}/> Seus Dados</h3>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                                  <input type="text" className="w-full border-2 border-gray-200 rounded-lg p-3 mt-1 focus:border-red-500 focus:outline-none transition bg-gray-50" placeholder="Ex: João da Silva" value={cliente.nome} onChange={e => setCliente({...cliente, nome: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                                  <input type="tel" className="w-full border-2 border-gray-200 rounded-lg p-3 mt-1 focus:border-red-500 focus:outline-none transition bg-gray-50" placeholder="(XX) 9XXXX-XXXX" value={cliente.telefone} onChange={e => setCliente({...cliente, telefone: e.target.value})} />
                              </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                              <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><MapPin size={18}/> Entrega</h3>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Endereço Completo</label>
                                  <textarea rows="2" className="w-full border-2 border-gray-200 rounded-lg p-3 mt-1 focus:border-red-500 focus:outline-none transition bg-gray-50" placeholder="Rua, Número, Bairro e Referência" value={cliente.endereco} onChange={e => setCliente({...cliente, endereco: e.target.value})} />
                              </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                              <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><CreditCard size={18}/> Pagamento</h3>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Forma de Pagamento</label>
                                  <select className="w-full border-2 border-gray-200 rounded-lg p-3 mt-1 bg-gray-50 font-bold text-gray-700" value={cliente.pagamento} onChange={e => setCliente({...cliente, pagamento: e.target.value})}>
                                      <option>Dinheiro</option>
                                      <option>PIX</option>
                                      <option>Cartão de Crédito</option>
                                      <option>Cartão de Débito</option>
                                  </select>
                              </div>
                              {cliente.pagamento === 'Dinheiro' && (
                                  <div className="animate-fade-in">
                                      <label className="text-xs font-bold text-gray-500 uppercase">Troco para quanto?</label>
                                      <input type="text" className="w-full border-2 border-gray-200 rounded-lg p-3 mt-1 focus:border-green-500 outline-none font-bold text-green-700" placeholder="R$ 50,00" value={cliente.troco} onChange={e => setCliente({...cliente, troco: e.target.value})} />
                                  </div>
                              )}
                               <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Observações (Opcional)</label>
                                  <input type="text" className="w-full border-2 border-gray-200 rounded-lg p-3 mt-1" placeholder="Ex: Sem cebola, campainha quebrada..." value={cliente.observacoes} onChange={e => setCliente({...cliente, observacoes: e.target.value})} />
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              <div className="p-5 border-t bg-white z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                  <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-500 font-medium">Total a Pagar</span>
                      <span className="text-3xl font-black text-gray-900">{formatMoney(totalCarrinho)}</span>
                  </div>
                  <button 
                    onClick={finalizarPedido} 
                    disabled={carrinho.length === 0 || !cliente.nome || !cliente.endereco || !cliente.telefone}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition transform active:scale-95"
                  >
                    {carrinho.length === 0 || !cliente.nome || !cliente.endereco || !cliente.telefone ? 'Preencha os dados acima' : 'Concluir Pedido'}
                    <ChevronRight strokeWidth={3} />
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}