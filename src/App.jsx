import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, MapPin, User, CheckCircle, Utensils, Home,
  Plus, Trash2, X, Package, ClipboardList, Pencil, Settings, 
  Bike, MessageCircle, Map, DollarSign, Users, 
  Calendar, CreditCard, ChefHat, TrendingUp, AlertCircle,
  Flame, UserPlus, Phone, Percent, Volume2, Play
} from 'lucide-react';

// --- CONFIGURAÇÃO DE SOM ---
// PARA USAR SEU SOM: Coloque o arquivo 'alerta.mp3' na pasta 'public' do projeto e mude para:
// const SOM_URL = "/alerta.mp3";
// const SOM_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; // Som de 'Ding' Online para teste
   const SOM_URL = "/alerta.mp3";

// --- COMPONENTES VISUAIS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-amber-100/80 overflow-hidden ${className}`}>{children}</div>
);

const Badge = ({ status }) => {
  const styles = {
    'Pendente': 'bg-red-100 text-red-700 border-red-200',
    'Saiu para Entrega': 'bg-orange-100 text-orange-700 border-orange-200',
    'Concluido': 'bg-green-100 text-green-700 border-green-200',
    'Cancelado': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${styles[status] || styles['Pendente']} flex items-center gap-1 shadow-sm`}>
      {status === 'Saiu para Entrega' && <Bike size={12} className="text-orange-600"/>}
      {status === 'Concluido' && <CheckCircle size={12}/>}
      {status ? status.toUpperCase() : 'UNK'}
    </span>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [abaAtiva, setAbaAtiva] = useState('dashboard'); 
  const [modalPedidoAberto, setModalPedidoAberto] = useState(false);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);

  // --- UTILITÁRIOS ---
  const getDataHoje = () => new Date().toISOString().split('T')[0];
  const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const carregarDados = (chave, padrao) => {
    try {
      const salvo = localStorage.getItem(chave);
      return salvo ? JSON.parse(salvo) : padrao;
    } catch (e) {
      console.error("Erro ao carregar dados", e);
      return padrao;
    }
  };

  // --- FUNÇÃO DE SOM ---
  const tocarSom = () => {
      const audio = document.getElementById('audio-alerta');
      if (audio) {
          audio.currentTime = 0; // Reinicia o som se já estiver tocando
          audio.play().catch(err => console.warn("O navegador bloqueou o som automático. Interaja com a página primeiro.", err));
      }
  };

  // --- ESTADOS GLOBAIS ---
  const [taxasFrete, setTaxasFrete] = useState(() => carregarDados('bd_taxas', [
    { id: 1, nome: "Bairro Vizinho (até 2km)", valor: 5.00 },
    { id: 2, nome: "Centro / Cidade", valor: 8.00 },
  ]));

  const [produtos, setProdutos] = useState(() => carregarDados('bd_produtos', [
    { id: 1, nome: "Dogão Simples", preco: 18.00, estoque: 50, opcoes: "Salsicha, Vina Dupla =+4.00", tipo: 'principal', categoria: 'Lanches' },
    { id: 2, nome: "Coca-Cola Lata", preco: 6.00, estoque: 24, opcoes: "", tipo: 'principal', categoria: 'Bebidas' },
    { id: 3, nome: "Bacon Extra", preco: 4.00, estoque: 100, opcoes: "", tipo: 'adicional' },
  ]));

  const [clientes, setClientes] = useState(() => carregarDados('bd_clientes', []));
  const [pedidos, setPedidos] = useState(() => carregarDados('bd_pedidos', []));
  const [filtroData, setFiltroData] = useState(getDataHoje());

  // PERSISTÊNCIA AUTOMÁTICA
  useEffect(() => { localStorage.setItem('bd_taxas', JSON.stringify(taxasFrete)); }, [taxasFrete]);
  useEffect(() => { localStorage.setItem('bd_produtos', JSON.stringify(produtos)); }, [produtos]);
  useEffect(() => { localStorage.setItem('bd_clientes', JSON.stringify(clientes)); }, [clientes]);
  useEffect(() => { localStorage.setItem('bd_pedidos', JSON.stringify(pedidos)); }, [pedidos]);

  // --- FORMULÁRIOS INICIAIS ---
  const formPedidoInicial = {
    id: null, nome: '', endereco: '', telefone: '', taxaEntrega: 0, pagamento: 'Dinheiro', trocoPara: '', observacoes: '', desconto: 0,
    itens: [{ produtoId: '', nome: '', qtd: 1, preco: 0, opcaoSelecionada: '', listaAdicionais: [] }] 
  };
  const [formPedido, setFormPedido] = useState(formPedidoInicial);

  const formProdutoInicial = { id: null, nome: '', preco: '', estoque: '', opcoes: '', tipo: 'principal', categoria: 'Lanches' };
  const [formProduto, setFormProduto] = useState(formProdutoInicial);

  const formClienteInicial = { id: null, nome: '', telefone: '', endereco: '', obs: '' };
  const [formCliente, setFormCliente] = useState(formClienteInicial);

  // --- LÓGICA GERAL DE CÁLCULO ---
  const extrairValorOpcao = (txt) => { if (!txt || !txt.includes('=+')) return 0; return parseFloat(txt.split('=+')[1]) || 0; };
  const extrairNomeOpcao = (txt) => { if (!txt) return ''; return txt.split('=+')[0].trim(); };

  const calcularSubtotalItens = (itens) => {
    if(!itens) return 0;
    return itens.reduce((acc, item) => {
      const pBase = Number(item.preco || 0);
      const pOpcao = extrairValorOpcao(item.opcaoSelecionada);
      const pAdics = item.listaAdicionais ? item.listaAdicionais.reduce((sum, adId) => {
        const p = produtos.find(x => x.id === adId); return sum + (p ? Number(p.preco) : 0);
      }, 0) : 0;
      return acc + ((pBase + pOpcao + pAdics) * Number(item.qtd || 1));
    }, 0);
  };

  const calcularTotalPedido = (itens, entrega, descontoPorcentagem) => {
      const subtotal = calcularSubtotalItens(itens);
      const valorDesconto = subtotal * ((descontoPorcentagem || 0) / 100);
      return (subtotal - valorDesconto) + Number(entrega || 0);
  };

  // --- IMPRESSÃO ---
  const imprimir = (p) => {
    const subtotal = calcularSubtotalItens(p.itens);
    const descontoVal = subtotal * ((p.desconto || 0) / 100);
    const totalFinal = (subtotal - descontoVal) + Number(p.taxaEntrega);
    const troco = p.trocoPara ? Number(p.trocoPara) - totalFinal : 0;

    const html = `
      <div style="font-family: monospace; width: 300px; font-size: 12px; color: black;">
        <div style="text-align:center; font-weight:bold; font-size:18px; margin-bottom:5px;">🌭 BEST DOG 🔥</div>
        <div style="border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px;">
           Senha: <b>#${p.id}</b> <span style="float:right">${p.hora}</span><br/>
           Data: ${new Date().toLocaleDateString('pt-BR')}
        </div>
        <div style="padding-bottom:10px;">
           <b>${p.cliente.nome.toUpperCase()}</b><br/>
           ${p.cliente.endereco}<br/>
           ${p.cliente.telefone ? `Tel: ${p.cliente.telefone}` : ''}
        </div>
        
        <table style="width:100%; border-collapse:collapse; border-top: 1px solid #000; border-bottom: 1px solid #000;">
           ${p.itens.map(i => {
              const pBase = Number(i.preco || 0);
              const pOpcao = extrairValorOpcao(i.opcaoSelecionada);
              const pAdics = i.listaAdicionais ? i.listaAdicionais.reduce((sum, adId) => {
                const pr = produtos.find(x => x.id === adId); return sum + (pr ? Number(pr.preco) : 0);
              }, 0) : 0;
              const unitarioTotal = pBase + pOpcao + pAdics;
              
              return `
               <tr style="border-bottom:1px dashed #ccc;">
                 <td style="vertical-align:top; width:20px; font-weight:bold; padding: 4px 0;">${i.qtd}x</td>
                 <td style="padding: 4px 0;">
                   ${i.nome}
                   ${i.opcaoSelecionada ? `<div style="font-size:10px;">> ${extrairNomeOpcao(i.opcaoSelecionada)}</div>` : ''}
                   ${i.listaAdicionais?.map(ad => `<div style="font-size:10px;">+ ${produtos.find(x=>x.id===ad)?.nome}</div>`).join('') || ''}
                 </td>
                 <td style="text-align:right; vertical-align:top; padding: 4px 0;">${(unitarioTotal * i.qtd).toFixed(2)}</td>
               </tr>`;
           }).join('')}
        </table>

        ${p.observacoes ? `<div style="margin:10px 0; border:1px solid #000; padding:5px; font-weight:bold; text-align:center; font-size:14px;">OBS: ${p.observacoes.toUpperCase()}</div>` : ''}

        <div style="font-size:14px; font-weight:bold; line-height:1.4; margin-top: 10px;">
            <div style="display:flex; justify-content:space-between">
              <span>Subtotal</span>
              <span>R$ ${subtotal.toFixed(2)}</span>
            </div>
            ${p.desconto > 0 ? `
              <div style="display:flex; justify-content:space-between; color: #000;">
                 <span>Desconto (${p.desconto}%)</span>
                 <span>- R$ ${descontoVal.toFixed(2)}</span>
              </div>
            ` : ''}
            <div style="display:flex; justify-content:space-between">
              <span>Entrega</span>
              <span>R$ ${Number(p.taxaEntrega).toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:5px; font-weight:normal; font-size:12px;">
              <span>Pagamento:</span>
              <span>${p.pagamento}</span>
            </div>
             ${p.pagamento === 'Dinheiro' && p.trocoPara ? `
              <div style="display:flex; justify-content:space-between; font-weight:normal; font-size:12px;">
                 <span>Troco para:</span>
                 <span>R$ ${Number(p.trocoPara).toFixed(2)}</span>
              </div>
               <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-top:2px;">
                 <span>DEVOLVER:</span>
                 <span>R$ ${troco.toFixed(2)}</span>
              </div>
            ` : ''}
        </div>

        <div style="font-size:32px; fontWeight:900; text-align:right; margin-top:10px; border-top:3px solid black; padding-top:5px;">
            TOTAL: R$ ${totalFinal.toFixed(2)}
        </div>
          
        <br/><div style="text-align:center; font-size:12px;">*** Obrigado pela preferência! ***</div>
      </div>`;

    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    frame.contentWindow.document.write(html);
    setTimeout(() => { frame.contentWindow.print(); document.body.removeChild(frame); }, 500);
  };

  // --- CLIENTES ---
  const abrirNovoCliente = () => { setFormCliente(formClienteInicial); setModalClienteAberto(true); };
  const editarCliente = (cli) => { setFormCliente(cli); setModalClienteAberto(true); };
  const salvarCliente = (e) => {
    e.preventDefault();
    const clienteFormatado = { ...formCliente, id: formCliente.id || Date.now() };
    if (formCliente.id) setClientes(clientes.map(c => c.id === formCliente.id ? clienteFormatado : c));
    else setClientes([...clientes, clienteFormatado]);
    setModalClienteAberto(false);
  };
  const excluirCliente = (id) => { if(confirm("Deseja apagar este cliente?")) setClientes(clientes.filter(c => c.id !== id)); };

  // --- PRODUTOS ---
  const salvarProduto = (e) => {
    e.preventDefault();
    const prodFormatado = {
        id: formProduto.id || Date.now(),
        nome: formProduto.nome,
        preco: parseFloat(formProduto.preco || 0),
        estoque: parseInt(formProduto.estoque || 0),
        opcoes: formProduto.opcoes,
        tipo: formProduto.tipo,
        categoria: formProduto.categoria
    };
    if (formProduto.id) setProdutos(produtos.map(p => p.id === formProduto.id ? prodFormatado : p));
    else setProdutos([...produtos, prodFormatado]);
    setModalProdutoAberto(false);
  };
  const editarProduto = (prod) => { setFormProduto(prod); setModalProdutoAberto(true); };
  const excluirProduto = (id) => { if(confirm("Excluir item?")) setProdutos(produtos.filter(p => p.id !== id)); };

  // --- PEDIDOS ---
  const salvarPedido = (e) => {
    e.preventDefault();
    
    // VALIDAR SE TEM ITENS
    if (!formPedido.itens || formPedido.itens.length === 0 || formPedido.itens.every(i => !i.produtoId)) {
        alert("⚠️ Atenção: Você precisa adicionar pelo menos um item ao pedido!");
        return;
    }

    const pedidoFmt = {
      ...formPedido,
      id: formPedido.id || Math.floor(Math.random() * 100000),
      total: calcularTotalPedido(formPedido.itens, formPedido.taxaEntrega, formPedido.desconto),
      data: formPedido.id ? pedidos.find(p => p.id === formPedido.id)?.data : getDataHoje(),
      hora: formPedido.id ? pedidos.find(p => p.id === formPedido.id)?.hora : new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      status: formPedido.id ? pedidos.find(p => p.id === formPedido.id)?.status : "Pendente",
      cliente: { nome: formPedido.nome, endereco: formPedido.endereco, telefone: formPedido.telefone }
    };
    if (formPedido.id) {
        setPedidos(pedidos.map(p => p.id === formPedido.id ? pedidoFmt : p));
    } else {
        setPedidos([pedidoFmt, ...pedidos]);
        tocarSom(); // TOCA SOM AQUI
    }
    setModalPedidoAberto(false);
  };

  const baixarEstoque = (pedido) => {
     const novosProds = [...produtos];
     pedido.itens.forEach(item => {
         const idx = novosProds.findIndex(p => p.id == item.produtoId);
         if(idx >= 0) novosProds[idx].estoque = Math.max(0, (novosProds[idx].estoque || 0) - item.qtd);
         item.listaAdicionais?.forEach(adId => {
             const idxAd = novosProds.findIndex(p => p.id == adId);
             if(idxAd >= 0) novosProds[idxAd].estoque = Math.max(0, (novosProds[idxAd].estoque || 0) - item.qtd);
         });
     });
     setProdutos(novosProds);
  };

  const avançarStatus = (id) => {
    const pedido = pedidos.find(p => p.id === id);
    if(!pedido) return;

    if(pedido.status === 'Pendente') {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: 'Saiu para Entrega' } : p));
        setTimeout(() => {
            enviarZap({ ...pedido, status: 'Saiu para Entrega' });
        }, 100);
    } else if (pedido.status === 'Saiu para Entrega') {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: 'Concluido' } : p));
        baixarEstoque(pedido);
    }
  };

  const cancelarPedido = (id) => { if(confirm("Cancelar este pedido?")) setPedidos(pedidos.map(p => p.id === id ? { ...p, status: 'Cancelado' } : p)); };

  // --- FILTROS ---
  const pedidosHoje = useMemo(() => pedidos.filter(p => p.data === getDataHoje()), [pedidos]);
  const pedidosPendentes = useMemo(() => pedidos.filter(p => p.status !== 'Concluido' && p.status !== 'Cancelado'), [pedidos]);
  
  const kpis = useMemo(() => {
    const concluidos = pedidosHoje.filter(p => p.status === 'Concluido');
    const totalHoje = concluidos.reduce((acc, p) => acc + (p.total || 0), 0);
    const qtdHoje = concluidos.length;
    const ticketMedio = qtdHoje > 0 ? totalHoje / qtdHoje : 0;
    return { totalHoje, qtdHoje, ticketMedio };
  }, [pedidosHoje]);

  // --- ACTIONS UI ---
  const abrirNovoPedido = () => { setFormPedido(formPedidoInicial); setModalPedidoAberto(true); };
  const abrirNovoProduto = () => { setFormProduto(formProdutoInicial); setModalProdutoAberto(true); };
  const editarPedido = (p) => { setFormPedido({...p, itens: p.itens || [], clienteId: null}); setModalPedidoAberto(true); }; 
  const selecionarClienteNoPedido = (id) => { 
      const c = clientes.find(x => x.id == id); 
      if(c) setFormPedido({...formPedido, clienteId: c.id, nome: c.nome, endereco: c.endereco, telefone: c.telefone, taxaEntrega: c.taxaFixa || 0}); 
  };
  
  const atualizarItem = (idx, campo, valor) => {
     const novos = [...formPedido.itens]; novos[idx][campo] = valor;
     if(campo === 'produtoId') {
         const p = produtos.find(x => x.id == valor);
         if(p) { novos[idx].nome = p.nome; novos[idx].preco = p.preco; novos[idx].opcaoSelecionada = p.opcoes ? p.opcoes.split(',')[0].trim() : ''; novos[idx].listaAdicionais = []; }
     }
     setFormPedido({...formPedido, itens: novos});
  };

  const toggleAdicional = (idxItem, idAd) => {
     const novos = [...formPedido.itens];
     const lista = novos[idxItem].listaAdicionais || [];
     if(lista.includes(idAd)) novos[idxItem].listaAdicionais = lista.filter(x => x !== idAd);
     else novos[idxItem].listaAdicionais = [...lista, idAd];
     setFormPedido({...formPedido, itens: novos});
  };

  const enviarZap = (p) => {
    let msgTroco = "";
    if(p.pagamento === 'Dinheiro' && p.trocoPara) {
        const troco = Number(p.trocoPara) - p.total;
        msgTroco = `\n💵 *Levar Troco p/ ${formatarMoeda(p.trocoPara)}*\n(Devolver: ${formatarMoeda(troco)})`;
    } else if (p.pagamento !== 'Dinheiro') {
        msgTroco = `\n💳 Levar Maquininha (${p.pagamento})`;
    }
    
    const saudacao = p.status === 'Saiu para Entrega' 
        ? `🛵 *SEU PEDIDO SAIU PARA ENTREGA!*` 
        : `Olá ${p.cliente.nome}! 🌭🔥`;

    const txt = `${saudacao}\n\n*PEDIDO #${p.id}*\n📍 ${p.cliente.endereco}\n\n${p.itens.map(i => `${i.qtd}x ${i.nome}`).join('\n')}\n\n💰 *Total: ${formatarMoeda(p.total)}*${msgTroco}\n\nObrigado pela preferência!`;
    window.open(`https://wa.me/55${p.cliente.telefone?.replace(/\D/g,'')}?text=${encodeURIComponent(txt)}`, '_blank');
  };
  const abrirNoMaps = (end) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`, '_blank');

  return (
    <div className="flex h-screen bg-amber-50 font-sans overflow-hidden">
      {/* ELEMENTO DE ÁUDIO INVISÍVEL */}
      <audio id="audio-alerta" src={SOM_URL} />

      <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-red-900/30 text-amber-50 shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-red-900/50">
          <div className="bg-gradient-to-br from-yellow-500 to-red-600 p-2 rounded-xl shadow-lg transform -rotate-6"><Utensils size={24} className="text-white"/></div>
          <div><h1 className="font-extrabold text-2xl tracking-tight italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">BEST DOG</h1><p className="text-xs text-red-300 font-bold">Gerenciador v8.0 🔥</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
           {[{ id: 'dashboard', icon: Home, label: 'Visão Geral' }, { id: 'pedidos', icon: ClipboardList, label: 'Pedidos', count: pedidosPendentes.length }, { id: 'vendas', icon: DollarSign, label: 'Caixa' }, { id: 'produtos', icon: Package, label: 'Cardápio' }, { id: 'clientes', icon: Users, label: 'Clientes' }, { id: 'config', icon: Settings, label: 'Configurações' }].map(item => (
             <button key={item.id} onClick={() => setAbaAtiva(item.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 font-bold ${abaAtiva === item.id ? 'bg-gradient-to-r from-red-600 to-red-700 text-yellow-100 shadow-md scale-[1.02]' : 'text-red-200/70 hover:bg-gray-800 hover:text-white'}`}>
               <div className="flex items-center gap-3"><item.icon size={20} className={abaAtiva === item.id ? 'text-yellow-300' : ''}/> <span>{item.label}</span></div>
               {item.count > 0 && <span className="bg-yellow-500 text-red-900 text-xs font-black px-2 py-0.5 rounded-full">{item.count}</span>}
             </button>
           ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto relative flex flex-col bg-amber-50/50">
        <header className="md:hidden bg-gradient-to-r from-gray-900 to-red-950 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-10 border-b-2 border-yellow-600">
           <div className="flex items-center gap-2 font-extrabold italic text-xl"><Utensils className="text-yellow-500"/> BEST DOG</div>
           <span className="text-xs bg-red-600 text-yellow-100 font-bold px-3 py-1 rounded-full">{pedidosPendentes.length}</span>
        </header>

        <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
            {abaAtiva === 'dashboard' && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 border-l-4 border-l-green-500 bg-white flex items-center justify-between"><div><p className="text-green-700 text-sm font-bold uppercase">Faturamento Hoje</p><h3 className="text-3xl font-black text-gray-800">{formatarMoeda(kpis.totalHoje)}</h3></div><div className="bg-green-100 p-3 rounded-full text-green-600"><DollarSign size={28}/></div></Card>
                    <Card className="p-6 border-l-4 border-l-yellow-500 bg-white flex items-center justify-between"><div><p className="text-yellow-700 text-sm font-bold uppercase">Pedidos Hoje</p><h3 className="text-3xl font-black text-gray-800">{kpis.qtdHoje}</h3></div><div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><ClipboardList size={28}/></div></Card>
                    <Card className="p-6 border-l-4 border-l-red-500 bg-white flex items-center justify-between"><div><p className="text-red-700 text-sm font-bold uppercase">Ticket Médio</p><h3 className="text-3xl font-black text-gray-800">{formatarMoeda(kpis.ticketMedio)}</h3></div><div className="bg-red-100 p-3 rounded-full text-red-600"><TrendingUp size={28}/></div></Card>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-0">
                       <div className="p-4 border-b border-amber-100 flex justify-between items-center bg-amber-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Flame size={18} className="text-red-500"/> Fila de Pedidos</h3> <button onClick={() => setAbaAtiva('pedidos')} className="text-xs text-red-600 font-bold hover:underline">Ver todos</button></div>
                       <div className="divide-y divide-amber-100 bg-white">
                          {pedidosPendentes.length === 0 ? <div className="p-8 text-center text-gray-400">Sem pedidos pendentes.</div> : 
                            pedidosPendentes.slice(0,5).map(p => (
                              <div key={p.id} className="p-4 flex justify-between items-center hover:bg-amber-50">
                                 <div><div className="flex items-center gap-2"><span className="font-black text-gray-800">#{p.id}</span> <Badge status={p.status}/></div><div className="text-xs text-gray-500 font-medium mt-1">{p.cliente?.nome || 'Cliente Removido'} • {p.hora}</div></div>
                                 <div className="text-right"><div className="font-black text-red-600">{formatarMoeda(p.total)}</div><button onClick={() => editarPedido(p)} className="text-xs text-amber-600 font-bold hover:underline">Editar</button></div>
                              </div>
                            ))
                          }
                       </div>
                    </Card>
                    <Card className="p-8 bg-gradient-to-br from-red-500 to-orange-600 text-white flex flex-col justify-center items-center text-center">
                        <Utensils size={64} className="mb-6 text-yellow-300 transform -rotate-12"/>
                        <h2 className="text-3xl font-extrabold mb-3 italic">Bateu a fome?</h2>
                        <button onClick={abrirNovoPedido} className="bg-yellow-400 text-red-800 font-black py-4 px-10 rounded-full shadow-lg hover:translate-y-1 transition-all text-xl flex items-center gap-3 border-2 border-yellow-300"><Plus size={24}/> NOVO PEDIDO</button>
                    </Card>
                 </div>
              </div>
            )}

            {abaAtiva === 'pedidos' && (
              <>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-800 italic flex items-center gap-2"><ClipboardList className="text-red-500"/> Fila de Pedidos</h2>
                    <button onClick={abrirNovoPedido} className="bg-red-600 text-white px-6 py-2 rounded-full font-bold shadow-md flex items-center gap-2"><Plus size={20}/> Novo</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pedidosPendentes.map(p => (
                       <div key={p.id} className="bg-white rounded-2xl shadow-sm border-2 border-amber-100 flex flex-col overflow-hidden hover:shadow-md">
                          <div className={`p-3 flex justify-between items-center text-white font-bold ${p.status === 'Saiu para Entrega' ? 'bg-orange-500' : 'bg-red-700'}`}>
                             <span>#{p.id}</span><span className="text-xs bg-black/20 px-2 rounded">{p.hora}</span>
                          </div>
                          <div className="p-4 flex-1 bg-amber-50/30">
                             <div className="flex justify-between items-start mb-1">
                                <div className="font-bold text-gray-800 text-lg">{p.cliente?.nome || 'Consumidor'}</div>
                                <button onClick={() => abrirNoMaps(p.cliente.endereco)} className="text-blue-600 bg-blue-50 p-1.5 rounded-lg hover:bg-blue-100 transition-colors" title="Abrir Mapa">
                                    <Map size={16}/>
                                </button>
                             </div>
                             <div className="text-xs text-gray-500 mb-3 flex items-start gap-1"><MapPin size={12} className="mt-0.5 shrink-0"/> {p.cliente?.endereco || 'Balcão'}</div>
                             <div className="space-y-2 mb-4 bg-white p-3 rounded-xl border border-amber-100">
                                {p.itens?.map((i, idx) => (
                                   <div key={idx} className="text-sm border-b border-amber-50 pb-2 last:border-0">
                                      <span className="font-black text-red-600">{i.qtd}x</span> <span className="font-bold text-gray-700">{i.nome}</span>
                                      {i.listaAdicionais?.length > 0 && <div className="text-xs text-amber-700 pl-4">+ {i.listaAdicionais.length} adic.</div>}
                                   </div>
                                ))}
                             </div>
                             {p.observacoes && <div className="bg-yellow-100 text-yellow-800 text-xs p-2 rounded font-bold">⚠️ {p.observacoes}</div>}
                          </div>
                          <div className="p-3 bg-white border-t border-amber-100">
                             <div className="flex justify-between items-center mb-3 p-2 bg-amber-50 rounded">
                                <span className="text-xs font-bold text-gray-500">{p.pagamento}</span>
                                <span className="font-black text-xl text-red-600">{formatarMoeda(p.total)}</span>
                             </div>
                             <div className="grid grid-cols-4 gap-2 mb-3">
                                <button onClick={() => imprimir(p)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded flex justify-center text-gray-600" title="Imprimir"><Printer size={16}/></button>
                                <button onClick={() => enviarZap(p)} className="p-2 bg-green-100 hover:bg-green-200 rounded flex justify-center text-green-700" title="WhatsApp"><MessageCircle size={16}/></button>
                                <button onClick={() => abrirNoMaps(p.cliente.endereco)} className="p-2 bg-blue-100 hover:bg-blue-200 rounded flex justify-center text-blue-700" title="Mapa"><Map size={16}/></button>
                                <button onClick={() => editarPedido(p)} className="p-2 bg-amber-100 hover:bg-amber-200 rounded flex justify-center text-amber-700" title="Editar"><Pencil size={16}/></button>
                             </div>
                             <button onClick={() => avançarStatus(p.id)} className={`w-full py-3 rounded-xl font-black text-white shadow-sm flex items-center justify-center gap-2 ${p.status === 'Pendente' ? 'bg-red-600' : 'bg-green-600'}`}>
                                {p.status === 'Pendente' ? <><Bike size={18}/> ENVIAR P/ ENTREGA</> : <><CheckCircle size={18}/> CONCLUIR PEDIDO</>}
                             </button>
                             <button onClick={() => cancelarPedido(p.id)} className="w-full text-center text-xs text-red-400 mt-2 hover:underline">Cancelar</button>
                          </div>
                       </div>
                    ))}
                    {pedidosPendentes.length === 0 && <div className="col-span-full py-20 text-center opacity-40">Sem pedidos na fila.</div>}
                 </div>
              </>
            )}

            {abaAtiva === 'vendas' && (
              <div className="space-y-6">
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 flex flex-wrap gap-4 items-center justify-between">
                    <h2 className="text-xl font-extrabold text-gray-800 italic flex items-center gap-2"><DollarSign className="text-green-600"/> Fechamento de Caixa</h2>
                    <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="border border-amber-200 rounded p-2 bg-amber-50 font-bold"/>
                 </div>
                 <Card className="p-0 border-amber-200">
                    <div className="p-4 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
                       <h3 className="font-bold text-gray-800">Histórico do Dia</h3>
                       <span className="font-black text-lg text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                           Total: {formatarMoeda(pedidos.filter(p => (p.status === 'Concluido') && p.data === filtroData).reduce((acc, p) => acc + (p.total || 0), 0))}
                       </span>
                    </div>
                    <div className="overflow-x-auto bg-white">
                       <table className="w-full text-left text-sm">
                          <thead className="bg-amber-50/50 uppercase text-gray-500 font-bold text-xs">
                             <tr><th className="p-4">#</th><th className="p-4">Cliente</th><th className="p-4">Status</th><th className="p-4">Pgto</th><th className="p-4 text-right">Total</th></tr>
                          </thead>
                          <tbody className="divide-y divide-amber-50">
                             {pedidos.filter(p => (p.status === 'Concluido' || p.status === 'Cancelado') && p.data === filtroData).map(p => (
                                <tr key={p.id} className="hover:bg-amber-50/50">
                                   <td className="p-4 font-bold text-gray-800">#{p.id}</td>
                                   <td className="p-4">{p.cliente?.nome || '-'}</td>
                                   <td className="p-4"><Badge status={p.status}/></td>
                                   <td className="p-4">{p.pagamento}</td>
                                   <td className={`p-4 font-black text-right ${p.status === 'Cancelado' ? 'text-gray-400 line-through' : 'text-green-600'}`}>{formatarMoeda(p.total)}</td>
                                </tr>
                             ))}
                             {pedidos.filter(p => (p.status === 'Concluido' || p.status === 'Cancelado') && p.data === filtroData).length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Nenhum registro hoje.</td></tr>}
                          </tbody>
                       </table>
                    </div>
                 </Card>
              </div>
            )}

            {abaAtiva === 'produtos' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-800 italic flex items-center gap-2"><Package className="text-red-500"/> Cardápio & Estoque</h2>
                    <button onClick={abrirNovoProduto} className="bg-gray-800 text-white px-6 py-2 rounded-full font-bold shadow-md flex items-center gap-2 hover:bg-black"><Plus size={20}/> Novo Item</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-0 border-red-100">
                          <div className="p-3 bg-red-50 border-b border-red-100 font-bold text-red-800 uppercase text-xs">Lanches & Bebidas (Principais)</div>
                          <div className="divide-y divide-gray-100">
                              {produtos.filter(p => p.tipo !== 'adicional').map(p => (
                                  <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                      <div><div className="font-bold text-gray-800">{p.nome}</div><div className="text-xs text-gray-500">Estoque: {p.estoque || 0} un • {formatarMoeda(p.preco)}</div></div>
                                      <div className="flex gap-2"><button onClick={() => editarProduto(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16}/></button><button onClick={() => excluirProduto(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button></div>
                                  </div>
                              ))}
                          </div>
                      </Card>
                      <Card className="p-0 border-yellow-100">
                          <div className="p-3 bg-yellow-50 border-b border-yellow-100 font-bold text-yellow-800 uppercase text-xs">Adicionais & Extras</div>
                          <div className="divide-y divide-gray-100">
                              {produtos.filter(p => p.tipo === 'adicional').map(p => (
                                  <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                      <div><div className="font-bold text-gray-800">{p.nome}</div><div className="text-xs text-gray-500">Add: {formatarMoeda(p.preco)}</div></div>
                                      <div className="flex gap-2"><button onClick={() => editarProduto(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16}/></button><button onClick={() => excluirProduto(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button></div>
                                  </div>
                              ))}
                          </div>
                      </Card>
                  </div>
               </div>
            )}

            {abaAtiva === 'clientes' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-extrabold text-gray-800 italic flex items-center gap-2"><Users className="text-blue-500"/> Cadastro de Clientes</h2>
                        <button onClick={abrirNovoCliente} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-md flex items-center gap-2 hover:bg-blue-700"><UserPlus size={20}/> Cadastrar Cliente</button>
                    </div>
                    <Card className="p-0 border-amber-200">
                       <table className="w-full text-left text-sm">
                           <thead className="bg-amber-50/50 uppercase text-xs font-bold text-gray-500"><tr><th className="p-4">Nome</th><th className="p-4">Contato</th><th className="p-4">Endereço / Obs</th><th className="p-4 text-right">Ações</th></tr></thead>
                           <tbody className="divide-y divide-gray-100">
                               {clientes.map(c => (
                                   <tr key={c.id} className="hover:bg-amber-50">
                                       <td className="p-4 font-bold text-gray-800">{c.nome}</td>
                                       <td className="p-4 flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {c.telefone || '-'}</td>
                                       <td className="p-4"><div className="text-gray-800">{c.endereco}</div>{c.obs && <div className="text-xs text-blue-600 font-bold bg-blue-50 inline-block px-1 rounded mt-1">{c.obs}</div>}</td>
                                       <td className="p-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => editarCliente(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={16}/></button><button onClick={() => excluirCliente(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button></div></td>
                                   </tr>
                               ))}
                               {clientes.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-400">Nenhum cliente cadastrado ainda.</td></tr>}
                           </tbody>
                       </table>
                    </Card>
                </div>
            )}

            {/* ABA CONFIGURAÇÕES */}
            {abaAtiva === 'config' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-extrabold text-gray-800 italic flex items-center gap-2"><Settings className="text-gray-600"/> Configurações</h2>
                    </div>
                    <Card className="p-6 border-gray-200">
                        <h3 className="font-bold text-lg mb-4">Áudio e Notificações</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={tocarSom} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-200">
                                <Play size={18} /> Testar Som de Alerta
                            </button>
                            <p className="text-sm text-gray-500">Clique para testar se o som está saindo corretamente.</p>
                        </div>
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-500">
                            <strong>Dica:</strong> Para usar seu próprio som, coloque um arquivo chamado <code>alerta.mp3</code> na pasta <code>public</code> do seu projeto e altere a constante <code>SOM_URL</code> no código.
                        </div>
                    </Card>
                </div>
            )}
        </div>

        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t-2 border-red-100 flex justify-around p-2 z-20 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <button onClick={() => setAbaAtiva('dashboard')} className={`flex flex-col items-center p-2 rounded-xl ${abaAtiva === 'dashboard' ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-400'}`}><Home size={22}/><span className="text-[10px]">Início</span></button>
           <button onClick={() => setAbaAtiva('pedidos')} className={`flex flex-col items-center p-2 rounded-xl ${abaAtiva === 'pedidos' ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-400'}`}><ClipboardList size={22}/><span className="text-[10px]">Pedidos</span></button>
           <button onClick={abrirNovoPedido} className="bg-gradient-to-r from-red-600 to-orange-500 text-yellow-100 rounded-full p-4 -mt-8 shadow-lg border-4 border-white active:scale-95 transition-transform"><Plus size={28} strokeWidth={3}/></button>
           <button onClick={() => setAbaAtiva('vendas')} className={`flex flex-col items-center p-2 rounded-xl ${abaAtiva === 'vendas' ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-400'}`}><DollarSign size={22}/><span className="text-[10px]">Caixa</span></button>
           <button onClick={() => setAbaAtiva('produtos')} className={`flex flex-col items-center p-2 rounded-xl ${abaAtiva === 'produtos' ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-400'}`}><ChefHat size={22}/><span className="text-[10px]">Menu</span></button>
        </div>
      </main>

      {modalProdutoAberto && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
               <h3 className="font-bold text-xl mb-4 text-gray-800">{formProduto.id ? 'Editar Produto' : 'Novo Produto'}</h3>
               <form onSubmit={salvarProduto} className="space-y-4">
                   <div><label className="text-xs font-bold uppercase text-gray-500">Nome do Item</label><input required className="w-full border-2 border-gray-200 rounded-lg p-2" value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})}/></div>
                   <div className="flex gap-4">
                       <div className="flex-1"><label className="text-xs font-bold uppercase text-gray-500">Preço (R$)</label><input required type="number" step="0.50" className="w-full border-2 border-gray-200 rounded-lg p-2" value={formProduto.preco} onChange={e => setFormProduto({...formProduto, preco: e.target.value})}/></div>
                       <div className="flex-1"><label className="text-xs font-bold uppercase text-gray-500">Estoque</label><input type="number" className="w-full border-2 border-gray-200 rounded-lg p-2" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})}/></div>
                   </div>
                   <div><label className="text-xs font-bold uppercase text-gray-500">Tipo do Item</label><select className="w-full border-2 border-gray-200 rounded-lg p-2 bg-white" value={formProduto.tipo} onChange={e => setFormProduto({...formProduto, tipo: e.target.value})}><option value="principal">Lanche/Bebida Principal</option><option value="adicional">Adicional / Extra</option></select></div>
                   {formProduto.tipo === 'principal' && (
                       <>
                         <div><label className="text-xs font-bold uppercase text-gray-500">Categoria</label><select className="w-full border-2 border-gray-200 rounded-lg p-2 bg-white" value={formProduto.categoria} onChange={e => setFormProduto({...formProduto, categoria: e.target.value})}><option value="Lanches">Lanches</option><option value="Bebidas">Bebidas</option><option value="Outros">Outros</option></select></div>
                         <div><label className="text-xs font-bold uppercase text-gray-500">Opções (separe por vírgula)</label><textarea placeholder="Ex: Salsicha, Vina =+2.00" className="w-full border-2 border-gray-200 rounded-lg p-2 h-20 text-sm" value={formProduto.opcoes} onChange={e => setFormProduto({...formProduto, opcoes: e.target.value})}/></div>
                       </>
                   )}
                   <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                       <button type="button" onClick={() => setModalProdutoAberto(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                       <button type="submit" className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black">Salvar</button>
                   </div>
               </form>
           </div>
        </div>
      )}

      {modalClienteAberto && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
               <h3 className="font-bold text-xl mb-4 text-blue-800 flex items-center gap-2"><UserPlus size={24}/> {formCliente.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
               <form onSubmit={salvarCliente} className="space-y-4">
                   <div><label className="text-xs font-bold uppercase text-gray-500">Nome Completo</label><input required className="w-full border-2 border-blue-100 rounded-lg p-2 focus:border-blue-400" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})}/></div>
                   <div><label className="text-xs font-bold uppercase text-gray-500">Telefone / WhatsApp</label><input className="w-full border-2 border-blue-100 rounded-lg p-2 focus:border-blue-400" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: e.target.value})}/></div>
                   <div><label className="text-xs font-bold uppercase text-gray-500">Endereço Completo</label><input required className="w-full border-2 border-blue-100 rounded-lg p-2 focus:border-blue-400" placeholder="Rua, Número, Bairro" value={formCliente.endereco} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})}/></div>
                   <div><label className="text-xs font-bold uppercase text-gray-500">Observações de Entrega</label><textarea placeholder="Ex: Casa de esquina, muro amarelo, campainha ruim..." className="w-full border-2 border-blue-100 rounded-lg p-2 h-20 text-sm focus:border-blue-400" value={formCliente.obs} onChange={e => setFormCliente({...formCliente, obs: e.target.value})}/></div>
                   <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                       <button type="button" onClick={() => setModalClienteAberto(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                       <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Salvar Cadastro</button>
                   </div>
               </form>
           </div>
        </div>
      )}

      {modalPedidoAberto && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
           <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border-4 border-amber-100">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-5 flex justify-between items-center">
                 <h3 className="font-extrabold text-xl flex items-center gap-2 italic">{formPedido.id ? 'Editar Dogão' : 'Novo Pedido na Chapa'}</h3>
                 <button onClick={() => setModalPedidoAberto(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/40"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-amber-50/50">
                 <form onSubmit={salvarPedido} className="space-y-6">
                    <Card className="p-5 border-red-100">
                       <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2 text-lg"><User size={20} className="text-red-500"/> Cliente</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {!formPedido.id && (
                             <div className="md:col-span-2 bg-red-50 p-3 rounded-xl border border-red-100">
                                <label className="text-xs font-bold text-red-700 uppercase mb-1 block">Buscar Salvo</label>
                                <select className="w-full border-2 border-red-200 rounded-lg p-2.5 bg-white" onChange={(e) => selecionarClienteNoPedido(e.target.value)} defaultValue=""><option value="">-- Selecione --</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                             </div>
                          )}
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Nome</label><input required className="w-full border-2 border-gray-200 rounded-lg p-2.5" value={formPedido.nome} onChange={e => setFormPedido({...formPedido, nome: e.target.value})}/></div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Telefone</label><input className="w-full border-2 border-gray-200 rounded-lg p-2.5" value={formPedido.telefone} onChange={e => setFormPedido({...formPedido, telefone: e.target.value})}/></div>
                          <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 uppercase">Endereço</label><input required className="w-full border-2 border-gray-200 rounded-lg p-2.5" value={formPedido.endereco} onChange={e => setFormPedido({...formPedido, endereco: e.target.value})}/></div>
                       </div>
                    </Card>

                    <Card className="p-5 border-yellow-200 bg-yellow-50/30">
                       <h4 className="font-bold text-yellow-800 mb-4 flex items-center gap-2 text-lg"><Utensils size={20} className="text-yellow-600"/> Itens</h4>
                       <div className="space-y-3">
                       {formPedido.itens.map((item, idx) => {
                          const prodAtual = produtos.find(p => p.id == item.produtoId);
                          const ehBebida = prodAtual?.categoria === 'Bebidas';
                          return (
                          <div key={idx} className="bg-white p-4 rounded-xl border-2 border-yellow-100 shadow-sm relative">
                             <div className="flex gap-2 items-start mb-3">
                                <div className="w-20"><label className="text-[10px] uppercase font-bold text-gray-400">Qtd</label><input type="number" min="1" className="w-full border-2 border-gray-200 rounded-lg p-2 text-center font-black text-lg text-red-600" value={item.qtd} onChange={e => atualizarItem(idx, 'qtd', e.target.value)}/></div>
                                <div className="flex-1"><label className="text-[10px] uppercase font-bold text-gray-400">Produto</label><select required className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-white font-bold text-gray-800" value={item.produtoId} onChange={e => atualizarItem(idx, 'produtoId', e.target.value)}><option value="">Selecione...</option>{produtos.filter(p => p.tipo !== 'adicional').map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                             </div>
                             {item.produtoId && (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mt-2 space-y-3">
                                   {prodAtual?.opcoes && (
                                      <div><label className="text-xs font-bold text-amber-700 uppercase block mb-1">Opção</label><select className="w-full text-sm border-2 border-amber-200 bg-white rounded-lg p-2" value={item.opcaoSelecionada} onChange={e => atualizarItem(idx, 'opcaoSelecionada', e.target.value)}>{prodAtual.opcoes.split(',').map((op, i) => <option key={i} value={op.trim()}>{extrairNomeOpcao(op)} {extrairValorOpcao(op) > 0 ? `(+R$${extrairValorOpcao(op).toFixed(2)})` : ''}</option>)}</select></div>
                                   )}
                                   {!ehBebida && (
                                     <div>
                                        <label className="text-xs font-bold text-amber-700 uppercase block mb-1">Adicionais</label>
                                        <div className="flex flex-wrap gap-2">
                                           {produtos.filter(p => p.tipo === 'adicional').map(ad => (
                                              <button type="button" key={ad.id} onClick={() => toggleAdicional(idx, ad.id)} className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all font-bold ${item.listaAdicionais?.includes(ad.id) ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>{ad.nome} (+R$ {ad.preco})</button>
                                           ))}
                                        </div>
                                     </div>
                                   )}
                                </div>
                             )}
                             {formPedido.itens.length > 1 && <button type="button" onClick={() => {const ni = formPedido.itens.filter((_, i) => i !== idx); setFormPedido({...formPedido, itens: ni})}} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>}
                          </div>
                        )})}
                       <button type="button" onClick={() => setFormPedido({...formPedido, itens: [...formPedido.itens, { produtoId: '', nome: '', qtd: 1, preco: 0, opcaoSelecionada: '', listaAdicionais: [] }]})} className="w-full py-3 bg-white border-2 border-dashed border-yellow-300 text-yellow-700 font-bold rounded-xl hover:bg-yellow-50 flex justify-center items-center gap-2"><Plus size={18}/> ADICIONAR ITEM</button>
                       </div>
                    </Card>

                    <Card className="p-5 border-green-200 bg-green-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                           <div className="bg-white p-3 rounded-xl border-2 border-green-100">
                              <label className="text-xs font-bold text-green-700 uppercase mb-2 block">Taxa Entrega</label>
                              <div className="flex gap-2">
                                 <select className="flex-1 border-2 border-gray-200 rounded-lg p-2 font-medium" onChange={e => setFormPedido({...formPedido, taxaEntrega: e.target.value})} value={taxasFrete.some(t => t.valor == formPedido.taxaEntrega) ? formPedido.taxaEntrega : ''}><option value="0">Balcão (R$ 0,00)</option>{taxasFrete.map(t => <option key={t.id} value={t.valor}>{t.nome} ({formatarMoeda(t.valor)})</option>)}<option value="">Manual...</option></select>
                                 <input type="number" className="w-20 border-2 border-gray-200 rounded-lg p-2 font-bold text-right" value={formPedido.taxaEntrega} onChange={e => setFormPedido({...formPedido, taxaEntrega: e.target.value})}/>
                              </div>
                           </div>
                           <div className="bg-white p-3 rounded-xl border-2 border-green-100">
                              <label className="text-xs font-bold text-green-700 uppercase mb-2 block">Pagamento</label>
                              <select className="w-full border-2 border-gray-200 rounded-lg p-2.5 font-bold" value={formPedido.pagamento} onChange={e => setFormPedido({...formPedido, pagamento: e.target.value})}><option value="Dinheiro">💵 Dinheiro</option><option value="PIX">✨ PIX</option><option value="Cartão">💳 Cartão</option></select>
                           </div>
                        </div>
                        {formPedido.pagamento === 'Dinheiro' && (
                           <div className="mb-4 bg-green-100 p-4 rounded-xl border-2 border-green-200 flex items-center justify-between">
                              <label className="text-sm font-bold text-green-800">Troco para:</label>
                              <input type="number" className="w-24 border-b-2 border-green-300 p-1 font-black text-lg text-green-800 bg-transparent focus:outline-none" placeholder="0,00" value={formPedido.trocoPara} onChange={e => setFormPedido({...formPedido, trocoPara: e.target.value})}/>
                           </div>
                        )}
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 flex items-center gap-1"><Percent size={12}/> Desconto (%)</label>
                            <input type="number" className="w-full border-2 border-gray-200 rounded-lg p-2.5 font-bold" placeholder="0" value={formPedido.desconto} onChange={e => setFormPedido({...formPedido, desconto: e.target.value})}/>
                        </div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Obs. Gerais</label><textarea className="w-full border-2 border-gray-200 rounded-xl p-3 h-20 text-sm bg-white" value={formPedido.observacoes} onChange={e => setFormPedido({...formPedido, observacoes: e.target.value})}/></div>
                    </Card>
                 </form>
              </div>
              <div className="p-5 bg-white border-t-2 border-red-100 flex justify-between items-center">
                 <div><span className="text-xs font-bold text-gray-500 uppercase">Total</span><div className="text-3xl font-black text-red-600">{formatarMoeda(calcularTotalPedido(formPedido.itens, formPedido.taxaEntrega, formPedido.desconto))}</div></div>
                 <button onClick={salvarPedido} className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-yellow-100 font-black py-4 px-10 rounded-full shadow-lg transition-all text-lg flex items-center gap-2">{formPedido.id ? 'SALVAR' : 'LANÇAR'}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;