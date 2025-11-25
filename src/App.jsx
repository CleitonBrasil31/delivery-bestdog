import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Printer, MapPin, User, CheckCircle, Utensils, 
  Plus, Trash2, Package, ClipboardList, Pencil, Settings, Bike, 
  MessageCircle, Map, DollarSign, History, Users, Calendar, 
  CreditCard, Box, Ban, RotateCcw, FileText, List, Clock, 
  GripVertical, Link, Percent, X, MessageSquare,
  Download, Upload, Database, TrendingUp, Search, AlertTriangle, Bell
} from 'lucide-react';

// --- ESTILOS DE IMPRESSÃO ---
const printStyles = `
  #area-impressao { display: none; }
  @media print {
    #area-impressao { display: block; }
    @page { margin: 0; size: auto; }
    body * { visibility: hidden; height: 0; overflow: hidden; }
    #area-impressao, #area-impressao * { visibility: visible; height: auto; overflow: visible; }
    #area-impressao {
      position: absolute; left: 0; top: 0; width: 80mm; padding: 5px;
      font-family: 'Courier New', Courier, monospace; color: black; background: white;
    }
    .no-print { display: none !important; }
  }
`;

// --- COMPONENTE DE NOTIFICAÇÃO (TOAST) ---
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
    {toasts.map(toast => (
      <div key={toast.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-lg shadow-2xl border-l-8 flex items-center justify-between animate-slide-in ${
        toast.type === 'success' ? 'bg-white border-green-500 text-green-800' : 
        toast.type === 'error' ? 'bg-white border-red-500 text-red-800' : 
        'bg-white border-blue-500 text-blue-800'
      }`}>
        <div className="font-bold flex items-center gap-2">
          {toast.type === 'success' && <CheckCircle size={20}/>}
          {toast.type === 'error' && <Ban size={20}/>}
          {toast.type === 'info' && <Bell size={20}/>}
          {toast.msg}
        </div>
        <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
      </div>
    ))}
  </div>
);

// --- COMPONENTE DE TIMER ---
const PedidoTimer = ({ timestampInicial, minutosPrevistos }) => {
  const [tempoRestante, setTempoRestante] = useState('--:--');
  const [estilo, setEstilo] = useState('text-orange-800 bg-orange-100 border-orange-300');

  useEffect(() => {
    const calcular = () => {
      if (!timestampInicial || isNaN(Number(timestampInicial)) || !minutosPrevistos) {
        setTempoRestante('--:--');
        return;
      }
      const agora = Date.now();
      const tempoTotalMs = Number(minutosPrevistos) * 60 * 1000;
      const horaFinal = Number(timestampInicial) + tempoTotalMs;
      const diferenca = horaFinal - agora;

      if (diferenca <= 0) {
        setTempoRestante(`ATRASADO ${Math.abs(Math.floor(diferenca / 60000))}min`);
        setEstilo('text-white bg-red-700 animate-pulse font-black border-red-900');
        return;
      }
      const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
      setTempoRestante(`${minutos}m ${segundos}s`);

      if (minutos < 5) setEstilo('text-red-700 bg-red-50 font-bold border-red-200');
      else if (minutos < 15) setEstilo('text-yellow-700 bg-yellow-50 border-yellow-200');
      else setEstilo('text-green-700 bg-green-50 border-green-200');
    };
    const intervalo = setInterval(calcular, 1000);
    calcular(); 
    return () => clearInterval(intervalo);
  }, [timestampInicial, minutosPrevistos]);

  return (<div className={`px-2 py-1 rounded-md flex items-center gap-1 text-xs border-2 ${estilo}`}><Clock size={12} /><span>{tempoRestante}</span></div>);
};

function App() {
  const [abaAtiva, setAbaAtiva] = useState('pedidos'); 
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoCadastro, setTipoCadastro] = useState('lanches');
  const [pedidoParaImpressao, setPedidoParaImpressao] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  // Estados de Busca
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  
  const dragItem = useRef();
  const dragOverItem = useRef();

  // --- UTILITÁRIOS ---
  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const getDataHoje = () => new Date().toISOString().split('T')[0];
  
  const formatarDataBR = (dataISO) => {
    if(!dataISO || typeof dataISO !== 'string') return '-';
    const partes = dataISO.split('-');
    if(partes.length !== 3) return dataISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };
  
  const carregarDados = (chave, padrao) => {
    try {
      const salvo = localStorage.getItem(chave);
      if (!salvo) return padrao;
      const dados = JSON.parse(salvo);
      if (Array.isArray(padrao) && !Array.isArray(dados)) return padrao;
      return dados;
    } catch {
      return padrao; 
    }
  };

  const extrairValorOpcao = (textoOpcao) => {
    if (!textoOpcao || typeof textoOpcao !== 'string' || !textoOpcao.includes('=+')) return 0;
    const partes = textoOpcao.split('=+');
    return parseFloat(partes[1]) || 0;
  };
  const extrairNomeOpcao = (textoOpcao) => {
    if (!textoOpcao || typeof textoOpcao !== 'string') return '';
    return textoOpcao.split('=+')[0].trim();
  };

  // --- DADOS INICIAIS ---
  const [taxasFrete, setTaxasFrete] = useState(() => carregarDados('bestdog_taxas', [{ id: 1, nome: "Bairro Vizinho", valor: 5.00 }, { id: 2, nome: "Centro", valor: 8.00 }]));
  const [configTempos, setConfigTempos] = useState(() => carregarDados('bestdog_tempos', { preparo: 25, deslocamento: 15 }));
  const [produtos, setProdutos] = useState(() => carregarDados('bestdog_produtos', [
    { id: 1, nome: "Vinagrete Cebola", preco: 0.00, estoque: 100, tipo: 'adicional', categoria: 'Lanches' },
    { id: 2, nome: "Vinagrete Repolho", preco: 0.00, estoque: 100, tipo: 'adicional', categoria: 'Lanches' },
    { id: 3, nome: "Purê", preco: 2.00, estoque: 50, tipo: 'adicional', categoria: 'Lanches' },
    { id: 4, nome: "Dog Max", preco: 18.00, estoque: 50, opcoes: "", tipo: 'principal', categoria: 'Lanches', idsAdicionaisPermitidos: [1, 2] },
    { id: 5, nome: "Dog Apollo", preco: 22.00, estoque: 50, opcoes: "", tipo: 'principal', categoria: 'Lanches', idsAdicionaisPermitidos: [1, 2, 3] },
    { id: 6, nome: "Coca-Cola", preco: 6.00, estoque: 50, opcoes: "", tipo: 'principal', categoria: 'Bebidas', idsAdicionaisPermitidos: [] },
  ]));
  const [clientes, setClientes] = useState(() => carregarDados('bestdog_clientes', []));
  const [pedidos, setPedidos] = useState(() => carregarDados('bestdog_pedidos', []));
  const [filtroData, setFiltroData] = useState(getDataHoje());

  // SALVAR AUTOMÁTICO
  useEffect(() => { localStorage.setItem('bestdog_taxas', JSON.stringify(taxasFrete)); }, [taxasFrete]);
  useEffect(() => { localStorage.setItem('bestdog_produtos', JSON.stringify(produtos)); }, [produtos]);
  useEffect(() => { localStorage.setItem('bestdog_clientes', JSON.stringify(clientes)); }, [clientes]);
  useEffect(() => { localStorage.setItem('bestdog_pedidos', JSON.stringify(pedidos)); }, [pedidos]);
  useEffect(() => { localStorage.setItem('bestdog_tempos', JSON.stringify(configTempos)); }, [configTempos]);

  // --- BACKUP ---
  const exportarBackup = () => {
    const dadosBackup = { data: new Date().toISOString(), sistema: 'BestDog_v1', produtos, clientes, pedidos, taxasFrete, configTempos };
    const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = href; link.download = `Backup_BestDog_${getDataHoje()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    addToast("Backup gerado com sucesso!", "success");
  };
  const importarBackup = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (confirm("ATENÇÃO: Restaurar backup substituirá TODOS os dados atuais. Continuar?")) {
          localStorage.setItem('bestdog_produtos', JSON.stringify(json.produtos || []));
          localStorage.setItem('bestdog_clientes', JSON.stringify(json.clientes || []));
          localStorage.setItem('bestdog_pedidos', JSON.stringify(json.pedidos || []));
          localStorage.setItem('bestdog_taxas', JSON.stringify(json.taxasFrete || []));
          localStorage.setItem('bestdog_tempos', JSON.stringify(json.configTempos || {}));
          window.location.reload();
        }
      } catch (err) { addToast("Erro ao ler arquivo de backup.", "error"); }
    }; reader.readAsText(file);
  };

  // --- RANKING & FILTROS (useMemo para performance) ---
  const produtosFiltrados = useMemo(() => {
    if(!buscaProduto) return produtos;
    return produtos.filter(p => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()));
  }, [produtos, buscaProduto]);

  const clientesFiltrados = useMemo(() => {
    if(!buscaCliente) return clientes;
    return clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || c.telefone.includes(buscaCliente));
  }, [clientes, buscaCliente]);

  const getProdutosMaisVendidos = () => {
    const contagem = {};
    pedidos.filter(p => p.status === 'Concluido').forEach(pedido => {
      pedido.itens.forEach(item => { contagem[item.nome] = (contagem[item.nome] || 0) + Number(item.qtd); });
    });
    return Object.entries(contagem).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  };

  // --- FORMULÁRIOS & ESTADOS ---
  const [formPedido, setFormPedido] = useState({
    id: null, nome: '', endereco: '', taxaEntrega: 0, pagamento: 'Dinheiro', observacoes: '', desconto: 0,
    tempoPreparo: 0, tempoDeslocamento: 0,
    itens: [{ produtoId: '', nome: '', qtd: 1, preco: 0, opcaoSelecionada: '', listaAdicionais: [] }] 
  });
  const [novoProduto, setNovoProduto] = useState({ nome: '', preco: '', estoque: '', opcoes: '', tipo: 'principal', categoria: 'Lanches', idsAdicionaisPermitidos: [] });
  const [novaTaxa, setNovaTaxa] = useState({ nome: '', valor: '' });
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', endereco: '', taxaFixa: '' });

  // --- AÇÕES DO SISTEMA ---
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    let _produtos = [...produtos];
    const draggedItemContent = _produtos.splice(dragItem.current, 1)[0];
    _produtos.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null; dragOverItem.current = null;
    setProdutos(_produtos);
  };

  const abrirNoMaps = (endereco) => { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, '_blank'); };
  const enviarParaMotoboy = (pedido) => {
    const texto = `🛵 *ENTREGA #${pedido.id}*\n👤 ${pedido.cliente.nome}\n📍 ${pedido.cliente.endereco}\n💳 Pgto: ${pedido.pagamento}\n💰 Cobrar: R$ ${pedido.total.toFixed(2)}\n\n🗺️ Mapa: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.cliente.endereco)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };
  const enviarParaCliente = (pedido) => {
    const resumoItens = pedido.itens.map(item => {
      let desc = `${item.qtd}x ${item.nome}`;
      const nomeOpcao = extrairNomeOpcao(item.opcaoSelecionada); if (nomeOpcao) desc += ` (${nomeOpcao})`;
      const adics = item.listaAdicionais?.map(id => produtos.find(p => p.id === id)?.nome).filter(Boolean) || [];
      if (adics.length > 0) desc += `\n   + ${adics.join(', ')}`;
      return desc;
    }).join('\n');
    const clienteTel = pedido.cliente?.telefone || '';
    const texto = `Olá *${pedido.cliente.nome}*! Seu pedido foi confirmado! 🌭\n\n*Resumo do Pedido #${pedido.id}:*\n${resumoItens}\n\n📍 *Entrega em:* ${pedido.cliente.endereco}\n💰 *Total:* R$ ${pedido.total.toFixed(2)}\n💳 *Pagamento:* ${pedido.pagamento}\n\nObrigado!`;
    window.open(`https://wa.me/${clienteTel ? '55'+clienteTel.replace(/\D/g,'') : ''}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const imprimirComanda = (pedido) => {
    setPedidoParaImpressao(pedido);
    setTimeout(() => { window.print(); setPedidoParaImpressao(null); }, 300);
  };

  const calcularTotalGeral = (itens, entrega, descontoPercent) => {
    if (!itens || !Array.isArray(itens)) return 0;
    const subtotal = itens.reduce((acc, item) => {
      const precoBase = Number(item.preco) || 0;
      const listaAdics = item.listaAdicionais || [];
      const precoAdicionais = listaAdics.reduce((sum, adId) => { const prod = produtos.find(p => p.id === adId); return sum + (prod ? Number(prod.preco) : 0); }, 0);
      const precoOpcao = extrairValorOpcao(item.opcaoSelecionada);
      return acc + ((precoBase + precoAdicionais + precoOpcao) * (Number(item.qtd) || 1));
    }, 0);
    const valorDesconto = subtotal * (Number(descontoPercent || 0) / 100);
    return (subtotal - valorDesconto) + (Number(entrega) || 0);
  };

  // --- CRUD PEDIDOS ---
  const salvarPedido = (e) => {
    e.preventDefault();
    const totalFinal = calcularTotalGeral(formPedido.itens, formPedido.taxaEntrega, formPedido.desconto);
    const existingPedido = formPedido.id ? pedidos.find(p => p.id === formPedido.id) : null;
    const pedidoFormatado = {
      id: formPedido.id || Math.floor(Math.random() * 1000000), 
      cliente: { nome: formPedido.nome, endereco: formPedido.endereco, telefone: formPedido.telefone },
      itens: formPedido.itens,
      taxaEntrega: Number(formPedido.taxaEntrega),
      desconto: Number(formPedido.desconto),
      pagamento: formPedido.pagamento,
      observacoes: formPedido.observacoes,
      tempoPreparo: Number(formPedido.tempoPreparo) || 0,
      tempoDeslocamento: Number(formPedido.tempoDeslocamento) || 0,
      timestamp: existingPedido ? existingPedido.timestamp : Date.now(),
      total: totalFinal,
      data: existingPedido ? existingPedido.data : getDataHoje(), 
      hora: existingPedido ? existingPedido.hora : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: existingPedido ? existingPedido.status : "Pendente"
    };
    if (formPedido.id) { 
      setPedidos(pedidos.map(p => p.id === formPedido.id ? pedidoFormatado : p));
      addToast(`Pedido #${formPedido.id} atualizado!`, "success");
    } else { 
      setPedidos([pedidoFormatado, ...pedidos]); 
      addToast("Novo pedido lançado!", "success");
    }
    setModalAberto(false);
  };

  const concluirPedido = (id) => { 
    const pedido = pedidos.find(p => p.id === id); if (!pedido) return;
    const novosProdutos = [...produtos];
    pedido.itens.forEach(itemPedido => {
      const indexProd = novosProdutos.findIndex(p => p.id == itemPedido.produtoId);
      if (indexProd >= 0) novosProdutos[indexProd].estoque = (novosProdutos[indexProd].estoque || 0) - Number(itemPedido.qtd);
      const listaAdics = itemPedido.listaAdicionais || [];
      listaAdics.forEach(adId => { const indexAd = novosProdutos.findIndex(p => p.id == adId); if (indexAd >= 0) novosProdutos[indexAd].estoque = (novosProdutos[indexAd].estoque || 0) - Number(itemPedido.qtd); });
    });
    setProdutos(novosProdutos); setPedidos(pedidos.map(p => p.id === id ? { ...p, status: 'Concluido' } : p));
    addToast("Pedido concluído e estoque baixado!", "success");
  };

  const cancelarPedido = (id) => { 
    if(confirm("Deseja realmente cancelar este pedido?")) {
      setPedidos(pedidos.map(p => p.id === id ? { ...p, status: 'Cancelado', data: getDataHoje() } : p));
      addToast("Pedido cancelado.", "error");
    }
  };

  const registrarDevolucao = (id) => { 
    if(!confirm("Confirmar devolução dos itens ao estoque?")) return;
    const pedido = pedidos.find(p => p.id === id); if (!pedido) return;
    const novosProdutos = [...produtos];
    pedido.itens.forEach(itemPedido => {
      const indexProd = novosProdutos.findIndex(p => p.id == itemPedido.produtoId);
      if (indexProd >= 0) novosProdutos[indexProd].estoque = (novosProdutos[indexProd].estoque || 0) + Number(itemPedido.qtd);
      const listaAdics = itemPedido.listaAdicionais || [];
      listaAdics.forEach(adId => { const indexAd = novosProdutos.findIndex(p => p.id == adId); if (indexAd >= 0) novosProdutos[indexAd].estoque = (novosProdutos[indexAd].estoque || 0) + Number(itemPedido.qtd); });
    });
    setProdutos(novosProdutos); setPedidos(pedidos.map(p => p.id === id ? { ...p, status: 'Cancelado' } : p)); 
    addToast("Estoque estornado com sucesso.", "success");
  };
  
  const resetarSistema = () => { if(confirm("CUIDADO: Isso apagará TODOS os dados. Tem certeza?")) { localStorage.clear(); window.location.reload(); } }

  // --- CRUD SECUNDÁRIO ---
  const salvarCliente = (e) => { e.preventDefault(); if (!novoCliente.nome) return; setClientes([...clientes, { id: Date.now(), nome: novoCliente.nome, telefone: novoCliente.telefone, endereco: novoCliente.endereco, taxaFixa: parseFloat(novoCliente.taxaFixa || 0) }]); setNovoCliente({ nome: '', telefone: '', endereco: '', taxaFixa: '' }); addToast("Cliente cadastrado!", "success"); };
  const deletarCliente = (id) => { setClientes(clientes.filter(c => c.id !== id)); addToast("Cliente removido.", "info"); };
  const salvarTaxa = (e) => { e.preventDefault(); if (!novaTaxa.nome) return; setTaxasFrete([...taxasFrete, { id: Date.now(), nome: novaTaxa.nome, valor: parseFloat(novaTaxa.valor) }]); setNovaTaxa({ nome: '', valor: '' }); addToast("Taxa salva!", "success"); };
  const deletarTaxa = (id) => setTaxasFrete(taxasFrete.filter(t => t.id !== id));
  const atualizarTaxaNaLista = (id, campo, valor) => { setTaxasFrete(taxasFrete.map(t => t.id === id ? { ...t, [campo]: campo === 'valor' ? Number(valor) : valor } : t)); };
  
  const salvarProduto = (e) => { 
    e.preventDefault(); if (!novoProduto.nome) return; 
    setProdutos([...produtos, { id: Date.now(), nome: novoProduto.nome, preco: parseFloat(novoProduto.preco), estoque: parseInt(novoProduto.estoque || 0), opcoes: novoProduto.opcoes, tipo: novoProduto.tipo, categoria: novoProduto.categoria, idsAdicionaisPermitidos: novoProduto.idsAdicionaisPermitidos || [] }]); 
    setNovoProduto({ nome: '', preco: '', estoque: '', opcoes: '', tipo: 'principal', idsAdicionaisPermitidos: [], categoria: 'Lanches' }); 
    addToast("Produto adicionado!", "success");
  };
  const deletarProduto = (id) => { if(confirm("Deletar produto?")) { setProdutos(produtos.filter(p => p.id !== id)); addToast("Produto removido.", "info"); } };
  const atualizarProduto = (id, campo, valor) => { setProdutos(produtos.map(p => { if (p.id === id) { const valorFinal = (campo === 'preco' || campo === 'estoque') ? (valor === '' ? '' : Number(valor)) : valor; return { ...p, [campo]: valorFinal }; } return p; })); };

  // --- MODAL CONTROLERS ---
  const abrirNovo = () => { setFormPedido({ id: null, nome: '', endereco: '', telefone: '', taxaEntrega: 0, desconto: 0, pagamento: 'Dinheiro', observacoes: '', tempoPreparo: Number(configTempos.preparo), tempoDeslocamento: Number(configTempos.deslocamento), itens: [{ produtoId: '', nome: '', qtd: 1, preco: 0, opcaoSelecionada: '', listaAdicionais: [] }] }); setModalAberto(true); };
  const abrirEdicao = (pedido) => { const itensClonados = pedido.itens.map(item => ({...item, listaAdicionais: [...(item.listaAdicionais || [])]})); setFormPedido({ id: pedido.id, nome: pedido.cliente.nome, endereco: pedido.cliente.endereco, telefone: pedido.cliente.telefone, taxaEntrega: pedido.taxaEntrega || 0, desconto: pedido.desconto || 0, pagamento: pedido.pagamento || 'Dinheiro', observacoes: pedido.observacoes || '', tempoPreparo: Number(pedido.tempoPreparo) || Number(configTempos.preparo), tempoDeslocamento: Number(pedido.tempoDeslocamento) || Number(configTempos.deslocamento), itens: itensClonados }); setModalAberto(true); };
  const selecionarCliente = (id) => { const c = clientes.find(cli => cli.id == id); if (c) setFormPedido({ ...formPedido, nome: c.nome, endereco: c.endereco, telefone: c.telefone, taxaEntrega: c.taxaFixa || 0 }); };
  
  // --- MANIPULAÇÃO ITENS DO PEDIDO ---
  const addLinhaItem = () => setFormPedido({ ...formPedido, itens: [...formPedido.itens, { produtoId: '', nome: '', qtd: 1, preco: 0, opcaoSelecionada: '', listaAdicionais: [] }] });
  const removeLinhaItem = (idx) => setFormPedido({ ...formPedido, itens: formPedido.itens.filter((_, i) => i !== idx) });
  const atualizaItem = (idx, campo, valor) => { const novosItems = formPedido.itens.map((item, i) => { if (i !== idx) return item; return { ...item, [campo]: valor }; }); setFormPedido({ ...formPedido, itens: novosItems }); };
  const selecionaProd = (idx, idProd) => { const prod = produtos.find(p => p.id == idProd); const novosItems = formPedido.itens.map((item, i) => { if (i !== idx) return item; if (prod) { return { ...item, produtoId: idProd, nome: prod.nome, preco: prod.preco, opcaoSelecionada: (prod.opcoes ? prod.opcoes.split(',')[0].trim() : ''), listaAdicionais: [] }; } return item; }); setFormPedido({ ...formPedido, itens: novosItems }); };
  const toggleAdicional = (idxItem, idAdicional) => { const novosItems = formPedido.itens.map((item, i) => { if (i !== idxItem) return item; const listaAtual = item.listaAdicionais || []; let novaLista; if (listaAtual.includes(idAdicional)) { novaLista = listaAtual.filter(id => id !== idAdicional); } else { novaLista = [...listaAtual, idAdicional]; } return { ...item, listaAdicionais: novaLista }; }); setFormPedido({ ...formPedido, itens: novosItems }); };
  const toggleAdicionalNoCadastro = (idAdicional) => { const listaAtual = novoProduto.idsAdicionaisPermitidos || []; if (listaAtual.includes(idAdicional)) { setNovoProduto({ ...novoProduto, idsAdicionaisPermitidos: listaAtual.filter(id => id !== idAdicional) }); } else { setNovoProduto({ ...novoProduto, idsAdicionaisPermitidos: [...listaAtual, idAdicional] }); } };

  const pedidosPendentes = pedidos.filter(p => p.status === 'Pendente');
  const pedidosHistorico = pedidos.filter(p => (p.status === 'Concluido' || p.status === 'Cancelado') && (p.data === filtroData || (!p.data && filtroData === getDataHoje())));
  const totalVendasDia = pedidosHistorico.filter(p => p.status === 'Concluido').reduce((acc, p) => acc + p.total, 0);

  return (
    <div className="min-h-screen bg-orange-50 font-sans pb-20 selection:bg-red-200">
      <style>{printStyles}</style>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* ÁREA DE IMPRESSÃO */}
      {pedidoParaImpressao && (
        <div id="area-impressao">
          <div style={{textAlign:'center'}}>
            <h1 style={{fontSize:'32px', fontWeight:'900', margin:0}}>BEST DOG</h1>
            <div style={{fontSize:'22px', fontWeight:'bold'}}>PEDIDO #{pedidoParaImpressao.id}</div>
            <div style={{fontSize:'14px'}}>{formatarDataBR(pedidoParaImpressao.data)} - {pedidoParaImpressao.hora}</div>
          </div>
          <div style={{borderBottom:'3px dashed black', margin:'10px 0'}}></div>
          <div style={{fontSize:'18px', lineHeight:'1.4'}}>
            <div style={{fontSize:'24px', fontWeight:'900'}}>{pedidoParaImpressao.cliente.nome}</div>
            <div>{pedidoParaImpressao.cliente.endereco}</div>
            <div style={{fontWeight:'bold'}}>{pedidoParaImpressao.cliente.telefone}</div>
          </div>
          <div style={{borderBottom:'3px dashed black', margin:'10px 0'}}></div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <tbody>
              {(pedidoParaImpressao.itens || []).map((item, idx) => {
                const listaAdics = item.listaAdicionais || [];
                const adics = listaAdics.map(id => produtos.find(p => p.id === id)).filter(Boolean);
                const valorOpcao = extrairValorOpcao(item.opcaoSelecionada);
                const nomeOpcao = extrairNomeOpcao(item.opcaoSelecionada);
                const totalAdics = adics.reduce((sum, a) => sum + Number(a.preco), 0);
                const totalItem = (Number(item.preco) + totalAdics + valorOpcao).toFixed(2);
                return (
                  <tr key={idx} style={{borderBottom:'1px dashed #ccc'}}>
                    <td style={{padding:'8px 0', fontWeight:'900', fontSize:'20px', verticalAlign:'top', width:'30px'}}>{item.qtd}x</td>
                    <td style={{padding:'8px 0', fontSize:'18px', fontWeight:'bold'}}>{item.nome}{nomeOpcao && <div style={{fontWeight:'normal', fontSize:'14px'}}>[{nomeOpcao}]</div>}{adics.map(ad => <div key={ad.id} style={{fontSize:'14px', fontWeight:'normal', marginLeft:'5px'}}>+ {ad.nome}</div>)}</td>
                    <td style={{padding:'8px 0', textAlign:'right', fontSize:'18px', fontWeight:'bold', verticalAlign:'top'}}>{totalItem}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pedidoParaImpressao.observacoes && (<div style={{margin:'15px 0', border:'2px solid black', padding:'5px', fontWeight:'900', fontSize:'18px', textAlign:'center', background:'#eee'}}>OBS: {pedidoParaImpressao.observacoes.toUpperCase()}</div>)}
          <div style={{borderBottom:'3px dashed black', margin:'10px 0'}}></div>
          <div style={{fontSize:'18px', fontWeight:'bold', lineHeight:'1.6'}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Subtotal</span><span>R$ {(pedidoParaImpressao.itens || []).reduce((acc, item) => { const pb = Number(item.preco) || 0; const adics = item.listaAdicionais || []; const pa = adics.reduce((s, aid) => s + (produtos.find(p=>p.id==aid)?.preco || 0),0); const pop = extrairValorOpcao(item.opcaoSelecionada); return acc + ((pb+pa+pop) * (item.qtd||1)); },0).toFixed(2)}</span></div>
            {pedidoParaImpressao.desconto > 0 && (<div style={{display:'flex', justifyContent:'space-between'}}><span>Desconto ({pedidoParaImpressao.desconto}%)</span><span>- R$ {((pedidoParaImpressao.itens || []).reduce((acc, item) => { const pb = Number(item.preco) || 0; const adics = item.listaAdicionais || []; const pa = adics.reduce((s, aid) => s + (produtos.find(p=>p.id==aid)?.preco || 0),0); const pop = extrairValorOpcao(item.opcaoSelecionada); return acc + ((pb+pa+pop) * (item.qtd||1)); },0) * (pedidoParaImpressao.desconto/100)).toFixed(2)}</span></div>)}
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Entrega</span><span>R$ {Number(pedidoParaImpressao.taxaEntrega).toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px'}}><span>Pagamento:</span><span>{pedidoParaImpressao.pagamento}</span></div>
          </div>
          <div style={{fontSize:'32px', fontWeight:'900', textAlign:'right', marginTop:'10px', borderTop:'3px solid black', paddingTop:'5px'}}>TOTAL: R$ {pedidoParaImpressao.total.toFixed(2)}</div>
          <br/><div style={{textAlign:'center', fontSize:'12px'}}>*** Obrigado pela preferência! ***</div>
        </div>
      )}
    
      <div className="max-w-7xl mx-auto p-4 md:p-6 no-print"> 
        <header className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-red-700 to-red-600 p-6 rounded-3xl shadow-xl border-b-8 border-red-900 mb-8">
          <div><h1 className="text-3xl md:text-5xl font-extrabold text-yellow-400 flex items-center gap-3 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"><Utensils className="text-white" size={40} /> BEST DOG</h1><p className="text-red-100 mt-1 font-medium tracking-wider opacity-80">SISTEMA DE GESTÃO - PDV v2.0</p></div>
          <div className="flex bg-black/20 p-2 rounded-xl mt-4 md:mt-0 overflow-x-auto items-center gap-2 backdrop-blur-sm">
            {['pedidos', 'vendas', 'clientes', 'produtos', 'config'].map(aba => (
              <button key={aba} onClick={() => setAbaAtiva(aba)} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-bold transition whitespace-nowrap border-2 ${abaAtiva === aba ? 'bg-yellow-400 text-red-900 border-yellow-600 shadow-md transform scale-105' : 'bg-transparent text-red-100 border-transparent hover:bg-white/10'}`}>
                {aba === 'pedidos' && <ClipboardList size={18}/>}
                {aba === 'vendas' && <DollarSign size={18}/>}
                {aba === 'clientes' && <Users size={18}/>}
                {aba === 'produtos' && <Package size={18}/>}
                {aba === 'config' && <Settings size={18}/>}
                {aba.charAt(0).toUpperCase() + aba.slice(1)}
              </button>
            ))}
            <button onClick={resetarSistema} className="ml-2 text-white/50 hover:text-white hover:bg-red-500/50 p-3 rounded-full transition"><Trash2 size={16}/></button>
          </div>
        </header>

        {abaAtiva === 'pedidos' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-2xl font-black text-red-900 uppercase">Fila de Pedidos</h2><p className="text-orange-700 font-medium">Gerencie os pedidos em andamento</p></div>
              <button onClick={abrirNovo} className="bg-yellow-500 hover:bg-yellow-400 text-red-900 border-b-4 border-yellow-700 active:border-b-0 px-8 py-3 rounded-full font-black shadow-lg transition-all flex items-center gap-2 text-lg animate-bounce"><Plus size={24} /> NOVO PEDIDO</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pedidosPendentes.length === 0 && <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50"><Utensils size={64} className="text-orange-300 mb-4"/><div className="text-orange-400 font-bold text-2xl">Nenhum pedido na fila</div></div>}
              {pedidosPendentes.map((pedido) => (
                <div key={pedido.id} className="bg-white rounded-xl shadow-lg border-2 border-orange-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative flex flex-col">
                  <div className="bg-red-700 p-3 text-white flex justify-between items-center relative overflow-hidden">
                    <span className="font-black text-xl relative z-10 flex items-center gap-2"><Clock size={16} className="text-yellow-400"/> {pedido.hora} <span className="text-xs bg-black/20 px-2 py-0.5 rounded opacity-80">#{pedido.id}</span></span>
                    <div className="flex gap-1 relative z-10"><button onClick={() => abrirEdicao(pedido)} className="bg-white/20 hover:bg-white text-white hover:text-red-700 p-1.5 rounded transition"><Pencil size={16} /></button><button onClick={() => {if(confirm("Excluir?")) setPedidos(pedidos.filter(p => p.id !== pedido.id))}} className="bg-white/20 hover:bg-red-900 text-white p-1.5 rounded transition"><Trash2 size={16} /></button></div>
                    <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]"></div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-3 pb-3 border-b-2 border-dashed border-gray-100">
                      <div className="flex items-center gap-2 text-gray-800 font-black text-lg truncate"><User size={18} className="text-red-500 shrink-0" /> {pedido.cliente.nome}</div>
                      <div className="flex items-center justify-between gap-2 text-gray-500 mt-1 text-sm font-medium"><span className="truncate flex-1 flex items-center gap-1"><MapPin size={14}/> {pedido.cliente.endereco}</span><button onClick={() => abrirNoMaps(pedido.cliente.endereco)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Map size={16} /></button></div>
                    </div>
                    {pedido.observacoes && (<div className="mb-3 bg-yellow-50 border-l-4 border-yellow-400 p-2 text-xs text-yellow-900 font-bold italic">"{pedido.observacoes}"</div>)}
                    <div className="mb-3 flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 font-bold flex flex-col"><span>Preparo: {pedido.tempoPreparo}m</span><span>Entrega: {pedido.tempoDeslocamento}m</span></div>
                        <PedidoTimer timestampInicial={pedido.timestamp} minutosPrevistos={(Number(pedido.tempoPreparo) + Number(pedido.tempoDeslocamento))} />
                    </div>
                    <div className="flex-1 space-y-2 mb-4">
                      {pedido.itens.map((item, i) => {
                        const adics = (item.listaAdicionais || []).map(id => produtos.find(p => p.id === id)).filter(Boolean);
                        const nomeOpcao = extrairNomeOpcao(item.opcaoSelecionada);
                        return (
                          <div key={i} className="text-sm text-gray-700 leading-tight">
                            <div className="font-bold flex items-baseline"><span className="text-red-600 mr-1">{item.qtd}x</span> {item.nome}</div>
                            {nomeOpcao && <div className="text-xs text-orange-600 pl-4">+ {nomeOpcao}</div>}
                            {adics.map(ad => <div key={ad.id} className="text-xs text-gray-500 pl-4">+ {ad.nome}</div>)}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-auto pt-3 border-t-2 border-gray-100">
                      <div className="flex justify-between items-end mb-3">
                         <div><div className="text-xs text-gray-400 font-bold uppercase">{pedido.pagamento}</div><div className="text-xs font-bold text-green-600 bg-green-50 px-1 rounded inline-block">Entrega: R$ {Number(pedido.taxaEntrega).toFixed(2)}</div></div>
                         <div className="text-2xl font-black text-gray-800">R$ {pedido.total.toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <button onClick={() => imprimirComanda(pedido)} className="btn-icon bg-gray-100 hover:bg-gray-200 text-gray-600"><Printer size={18}/></button>
                        <button onClick={() => enviarParaMotoboy(pedido)} className="btn-icon bg-green-100 hover:bg-green-200 text-green-700"><Bike size={18}/></button>
                        <button onClick={() => enviarParaCliente(pedido)} className="btn-icon bg-blue-100 hover:bg-blue-200 text-blue-700"><MessageSquare size={18}/></button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => cancelarPedido(pedido.id)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg font-bold text-xs uppercase transition border border-red-100">Cancelar</button>
                        <button onClick={() => concluirPedido(pedido.id)} className="flex-[2] bg-green-500 text-white hover:bg-green-600 py-2 rounded-lg font-bold text-sm uppercase transition shadow-md flex items-center justify-center gap-1"><CheckCircle size={16}/> Concluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {abaAtiva === 'vendas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-md border border-gray-100">
              <div className="flex items-center gap-3 text-gray-700"><Calendar size={28} className="text-green-600"/><span className="font-black text-xl">Fluxo de Caixa</span></div>
              <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="border-2 border-gray-200 rounded-lg p-2 font-bold text-gray-700 bg-gray-50 focus:border-green-500 outline-none"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-green-100 font-bold mb-2 text-sm uppercase tracking-wider">Faturamento Líquido (Dia)</h2>
                        <div className="text-5xl font-black drop-shadow-md">R$ {totalVendasDia.toFixed(2)}</div>
                        <div className="mt-4 flex gap-2">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{pedidosHistorico.filter(p => p.status === 'Concluido').length} vendas</span>
                            <span className="bg-red-500/20 px-3 py-1 rounded-full text-sm font-medium text-red-100">{pedidosHistorico.filter(p => p.status === 'Cancelado').length} cancelados</span>
                        </div>
                    </div>
                    <DollarSign size={120} className="absolute -right-6 -bottom-6 text-white/10" />
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 flex flex-col">
                    <h2 className="text-lg font-black text-gray-700 flex items-center gap-2 mb-4"><TrendingUp size={20} className="text-orange-500"/> Mais Vendidos</h2>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                        {getProdutosMaisVendidos().length > 0 ? getProdutosMaisVendidos().map((prod, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3"><span className="font-black text-orange-400 text-lg w-6">#{idx + 1}</span><span className="font-bold text-gray-700">{prod.nome}</span></div>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-gray-200">{prod.qtd} un</span>
                            </div>
                        )) : <div className="text-center text-gray-400 py-4 italic">Sem dados suficientes hoje.</div>}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center"><h2 className="text-lg font-black text-gray-700 uppercase flex items-center gap-2"><History size={20}/> Histórico Detalhado</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-black"><tr><th className="p-4">ID</th><th className="p-4">Hora</th><th className="p-4">Cliente</th><th className="p-4">Valor</th><th className="p-4">Pagamento</th><th className="p-4">Status</th><th className="p-4 text-right">Ação</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 text-sm">{pedidosHistorico.slice().reverse().map((pedido) => (
                        <tr key={pedido.id} className={`hover:bg-gray-50 transition ${pedido.status === 'Cancelado' ? 'opacity-50' : ''}`}>
                            <td className="p-4 font-bold text-gray-500">#{pedido.id}</td>
                            <td className="p-4 text-gray-500">{pedido.hora}</td>
                            <td className="p-4 font-bold text-gray-800">{pedido.cliente.nome}</td>
                            <td className={`p-4 font-black ${pedido.status === 'Cancelado' ? 'line-through' : 'text-green-600'}`}>R$ {pedido.total.toFixed(2)}</td>
                            <td className="p-4 text-gray-500">{pedido.pagamento}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-black uppercase ${pedido.status === 'Concluido' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{pedido.status}</span></td>
                            <td className="p-4 text-right">{pedido.status === 'Concluido' && (<button onClick={() => registrarDevolucao(pedido.id)} className="text-red-500 hover:text-red-700 font-bold text-xs uppercase flex items-center gap-1 ml-auto"><RotateCcw size={12}/> Estornar</button>)}</td>
                        </tr>
                    ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'clientes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-500 h-fit">
                <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3 uppercase"><Plus size={24} className="text-blue-600"/> Cadastro Rápido</h2>
                <form onSubmit={salvarCliente} className="space-y-4">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome</label><input required type="text" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold" value={novoCliente.nome} onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Telefone</label><input type="text" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold" value={novoCliente.telefone} onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Endereço</label><input required type="text" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold" value={novoCliente.endereco} onChange={(e) => setNovoCliente({...novoCliente, endereco: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Frete Fixo (Opcional)</label><div className="relative"><span className="absolute left-3 top-2.5 text-blue-500 font-bold">R$</span><input type="number" step="0.50" className="w-full border-2 border-gray-200 rounded-lg p-2.5 pl-10 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none font-bold" value={novoCliente.taxaFixa} onChange={(e) => setNovoCliente({...novoCliente, taxaFixa: e.target.value})} /></div></div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-black uppercase tracking-wide transition shadow-lg mt-2">Salvar</button>
                </form>
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                  <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-lg font-black text-gray-700 uppercase flex items-center gap-2"><Users size={20}/> Base de Clientes <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{clientesFiltrados.length}</span></h2>
                      <div className="relative w-64"><Search size={16} className="absolute left-3 top-2.5 text-gray-400"/><input type="text" placeholder="Buscar por nome ou telefone..." className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 text-sm focus:border-blue-500 outline-none" value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)}/></div>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-white text-gray-500 text-xs uppercase font-bold border-b border-gray-100"><tr><th className="p-4">Nome</th><th className="p-4">Endereço</th><th className="p-4">Frete Fixo</th><th className="p-4 text-right">Ações</th></tr></thead>
                          <tbody className="divide-y divide-gray-50">{clientesFiltrados.map((cli) => (<tr key={cli.id} className="hover:bg-blue-50 transition"><td className="p-4"><div className="font-bold text-gray-800">{cli.nome}</div><div className="text-xs text-gray-400">{cli.telefone}</div></td><td className="p-4 text-sm text-gray-600">{cli.endereco}</td><td className="p-4 font-bold text-green-600">{cli.taxaFixa ? `R$ ${Number(cli.taxaFixa).toFixed(2)}` : '-'}</td><td className="p-4 text-right"><button onClick={() => deletarCliente(cli.id)} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition"><Trash2 size={18} /></button></td></tr>))}</tbody>
                      </table>
                      {clientesFiltrados.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum cliente encontrado.</div>}
                  </div>
              </div>
          </div>
        )}

        {abaAtiva === 'produtos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-red-500 h-fit">
                <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3 uppercase"><Plus size={24} className="text-red-600"/> Cadastro de Item</h2>
                <form onSubmit={salvarProduto} className="space-y-4">
                  <div className="flex bg-gray-100 p-1 rounded-lg"><button type="button" onClick={() => setNovoProduto({...novoProduto, tipo: 'principal'})} className={`flex-1 py-2 rounded-md text-xs font-black uppercase transition ${novoProduto.tipo === 'principal' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Produto</button><button type="button" onClick={() => setNovoProduto({...novoProduto, tipo: 'adicional'})} className={`flex-1 py-2 rounded-md text-xs font-black uppercase transition ${novoProduto.tipo === 'adicional' ? 'bg-white shadow text-yellow-600' : 'text-gray-500'}`}>Adicional</button></div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome</label><input required type="text" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-red-500 outline-none font-bold" value={novoProduto.nome} onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Preço</label><input required type="number" step="0.50" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-red-500 outline-none font-bold" value={novoProduto.preco} onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})} /></div>
                  {novoProduto.tipo === 'principal' && (
                    <>
                     <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Categoria</label><select className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-red-500 outline-none font-bold" value={novoProduto.categoria} onChange={(e) => setNovoProduto({...novoProduto, categoria: e.target.value})}><option value="Lanches">Lanches 🌭</option><option value="Bebidas">Bebidas 🥤</option><option value="Combos">Combos 🍟</option><option value="Sobremesas">Sobremesas 🍦</option><option value="Outros">Outros</option></select></div>
                     <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Opções (Ex: Molho=+2.00)</label><input type="text" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-red-500 outline-none font-bold" value={novoProduto.opcoes} onChange={(e) => setNovoProduto({...novoProduto, opcoes: e.target.value})} /></div>
                     <div className="pt-2"><label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Adicionais Permitidos:</label><div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50 grid grid-cols-2 gap-2">{produtos.filter(p => p.tipo === 'adicional').map(ad => (<label key={ad.id} className="flex items-center gap-2 text-xs p-1 cursor-pointer"><input type="checkbox" checked={novoProduto.idsAdicionaisPermitidos?.includes(ad.id) || false} onChange={() => toggleAdicionalNoCadastro(ad.id)} className="rounded text-red-600"/><span>{ad.nome}</span></label>))}</div></div>
                    </>
                  )}
                  <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Estoque Inicial</label><input type="number" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-red-500 outline-none font-bold" value={novoProduto.estoque} onChange={(e) => setNovoProduto({...novoProduto, estoque: e.target.value})} /></div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-black uppercase tracking-wide transition shadow-lg">Cadastrar</button>
                </form>
              </div>

              <div className="md:col-span-2 bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4"><h2 className="text-lg font-black text-gray-700 uppercase flex items-center gap-2"><ClipboardList size={20}/> Cardápio</h2>
                    <div className="flex bg-gray-200 p-1 rounded"><button onClick={() => setTipoCadastro('lanches')} className={`px-3 py-1 rounded text-xs font-bold uppercase ${tipoCadastro === 'lanches' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Lanches</button><button onClick={() => setTipoCadastro('adicionais')} className={`px-3 py-1 rounded text-xs font-bold uppercase ${tipoCadastro === 'adicionais' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Adicionais</button></div>
                  </div>
                  <div className="relative w-full md:w-64"><Search size={16} className="absolute left-3 top-2.5 text-gray-400"/><input type="text" placeholder="Filtrar item..." className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 text-sm focus:border-red-500 outline-none" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)}/></div>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-bold"><tr><th className="p-4 w-10"></th><th className="p-4">Item</th><th className="p-4">Preço</th><th className="p-4">Estoque</th><th className="p-4 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {tipoCadastro === 'lanches' ? ([...new Set(produtosFiltrados.filter(p => p.tipo !== 'adicional').map(p => p.categoria || 'Geral'))].map(cat => (
                            <React.Fragment key={cat}>
                               <tr className="bg-red-50/50"><td colSpan="5" className="p-2 pl-4 font-black text-red-800 text-xs uppercase tracking-wider">{cat}</td></tr>
                               {produtosFiltrados.filter(p => p.tipo !== 'adicional' && (p.categoria || 'Geral') === cat).map((prod, index) => (
                                  <tr key={prod.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} className="hover:bg-gray-50 group bg-white">
                                    <td className="p-4 text-gray-300"><GripVertical size={16}/></td>
                                    <td className="p-4"><input type="text" value={prod.nome} onChange={(e) => atualizarProduto(prod.id, 'nome', e.target.value)} className="bg-transparent font-bold text-gray-700 w-full outline-none focus:text-red-600"/></td>
                                    <td className="p-4"><div className="relative"><span className="absolute left-0 top-0 text-xs text-gray-400">R$</span><input type="number" step="0.50" value={prod.preco} onChange={(e) => atualizarProduto(prod.id, 'preco', e.target.value)} className="bg-transparent pl-4 w-20 font-bold text-gray-700 outline-none focus:text-green-600"/></div></td>
                                    <td className="p-4"><div className={`flex items-center gap-2 px-2 py-1 rounded w-fit ${prod.estoque < 10 ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : 'bg-gray-100 text-gray-600'}`}><Box size={14} className={prod.estoque < 10 ? 'text-red-500' : 'text-gray-400'}/><input type="number" value={prod.estoque || ''} onChange={(e) => atualizarProduto(prod.id, 'estoque', e.target.value)} className="bg-transparent w-12 outline-none font-bold text-center"/></div></td>
                                    <td className="p-4 text-right"><button onClick={() => deletarProduto(prod.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button></td>
                                  </tr>
                               ))}
                            </React.Fragment>
                         ))) : (
                         produtosFiltrados.filter(p => p.tipo === 'adicional').map((prod, index) => (
                           <tr key={prod.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} className="hover:bg-gray-50 group bg-white">
                             <td className="p-4 text-gray-300"><GripVertical size={16}/></td>
                             <td className="p-4"><input type="text" value={prod.nome} onChange={(e) => atualizarProduto(prod.id, 'nome', e.target.value)} className="bg-transparent font-bold text-gray-700 w-full outline-none focus:text-yellow-600"/></td>
                             <td className="p-4"><div className="relative"><span className="absolute left-0 top-0 text-xs text-gray-400">R$</span><input type="number" step="0.50" value={prod.preco} onChange={(e) => atualizarProduto(prod.id, 'preco', e.target.value)} className="bg-transparent pl-4 w-20 font-bold text-gray-700 outline-none focus:text-green-600"/></div></td>
                             <td className="p-4"><div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded w-fit"><Box size={14} className="text-gray-400"/><input type="number" value={prod.estoque || ''} onChange={(e) => atualizarProduto(prod.id, 'estoque', e.target.value)} className="bg-transparent w-12 outline-none font-bold text-center text-gray-600"/></div></td>
                             <td className="p-4 text-right"><button onClick={() => deletarProduto(prod.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button></td>
                           </tr>
                         ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        )}

        {abaAtiva === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-zinc-500 h-fit"><h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3 uppercase"><Bike size={24} className="text-zinc-600"/> Taxas de Entrega</h2><form onSubmit={salvarTaxa} className="space-y-4"><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nome da Zona</label><input required type="text" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-zinc-500 outline-none font-bold" value={novaTaxa.nome} onChange={(e) => setNovaTaxa({...novaTaxa, nome: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor (R$)</label><input required type="number" step="0.50" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-zinc-500 outline-none font-bold" value={novaTaxa.valor} onChange={(e) => setNovaTaxa({...novaTaxa, valor: e.target.value})} /></div><button type="submit" className="w-full bg-zinc-700 hover:bg-zinc-800 text-white py-3 rounded-lg font-black uppercase tracking-wide transition shadow-lg mt-2">Adicionar</button></form><div className="mt-6 border-t pt-4"><h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Zonas Cadastradas</h3><ul className="space-y-2">{taxasFrete.map(t => <li key={t.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm"><span className="font-bold">{t.nome}</span><span className="flex items-center gap-2">R$ {t.valor.toFixed(2)} <button onClick={() => deletarTaxa(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></span></li>)}</ul></div></div>
            <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-500 h-fit"><h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3 uppercase"><Database size={24} className="text-blue-600"/> Backup & Dados</h2><p className="text-sm text-gray-500 mb-4 bg-blue-50 p-3 rounded border border-blue-100">Seus dados ficam salvos apenas neste computador. Faça backups semanais.</p><div className="space-y-4"><button onClick={exportarBackup} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition uppercase shadow-lg"><Download size={20}/> Baixar Backup</button><div className="relative group"><input type="file" accept=".json" onChange={importarBackup} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/><button className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-4 rounded-lg font-bold group-hover:bg-gray-200 transition uppercase border-2 border-dashed border-gray-300"><Upload size={20}/> Restaurar Arquivo</button></div></div></div>
            <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-orange-500 h-fit"><h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3 uppercase"><Settings size={24} className="text-orange-600"/> Ajustes Finos</h2><div className="space-y-4"><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tempo Preparo Padrão (min)</label><input type="number" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-orange-500 outline-none font-bold" value={configTempos.preparo} onChange={(e) => setConfigTempos({...configTempos, preparo: e.target.value})} /></div><div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tempo Entrega Padrão (min)</label><input type="number" className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:border-orange-500 outline-none font-bold" value={configTempos.deslocamento} onChange={(e) => setConfigTempos({...configTempos, deslocamento: e.target.value})} /></div></div></div>
          </div>
        )}
        
        {modalAberto && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-orange-50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border-4 border-white/20 relative max-h-[90vh] flex flex-col">
              <div className={`p-5 flex justify-between items-center text-white shrink-0 ${formPedido.id ? 'bg-blue-600' : 'bg-red-700'}`}>
                <h2 className="font-black text-2xl flex items-center gap-3 uppercase shadow-black/20 drop-shadow-md">{formPedido.id ? <><Pencil size={24}/> Editar Pedido #{formPedido.id}</> : <><Plus size={24}/> Anotar Pedido</>}</h2>
                <button onClick={() => setModalAberto(false)} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition"><X size={24} /></button>
              </div>
              <form onSubmit={salvarPedido} className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {!formPedido.id && (<div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"><label className="block text-xs font-black text-blue-800 mb-2 uppercase flex items-center gap-1"><User size={14}/> Cliente Cadastrado?</label><select className="w-full border-2 border-blue-300 rounded-lg p-3 bg-white text-blue-900 font-bold outline-none focus:border-blue-500 cursor-pointer" onChange={(e) => selecionarCliente(e.target.value)} defaultValue=""><option value="">Selecione...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.endereco}</option>)}</select></div>)}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div><label className="label-form">Nome do Cliente</label><input required type="text" className="input-form" value={formPedido.nome} onChange={(e) => setFormPedido({...formPedido, nome: e.target.value})} /></div>
                     <div><label className="label-form">Endereço</label><input required type="text" className="input-form" value={formPedido.endereco} onChange={(e) => setFormPedido({...formPedido, endereco: e.target.value})} /></div>
                </div>
                <div className="flex gap-4 bg-orange-100 p-4 rounded-xl border border-orange-200 mb-6">
                    <div className="flex-1"><label className="label-form text-orange-800">Tempo Cozinha</label><input type="number" className="input-form text-center border-orange-300 text-orange-700" value={formPedido.tempoPreparo} onChange={(e) => setFormPedido({...formPedido, tempoPreparo: e.target.value})} /></div>
                    <div className="flex-1"><label className="label-form text-orange-800">Tempo Entrega</label><input type="number" className="input-form text-center border-orange-300 text-orange-700" value={formPedido.tempoDeslocamento} onChange={(e) => setFormPedido({...formPedido, tempoDeslocamento: e.target.value})} /></div>
                </div>
                <div className="mb-6">
                  <h3 className="font-black text-red-900 uppercase text-lg mb-3 flex items-center gap-2"><ClipboardList/> Itens</h3>
                  <div className="space-y-4">
                  {formPedido.itens.map((item, index) => {
                    const produtoPrincipal = produtos.find(p => p.id == item.produtoId);
                    const idsPermitidos = produtoPrincipal?.idsAdicionaisPermitidos || [];
                    const adicionaisDisponiveis = produtos.filter(p => p.tipo === 'adicional' && idsPermitidos.includes(p.id));
                    return (
                      <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group hover:border-red-300 transition-colors">
                        {formPedido.itens.length > 1 && (<button type="button" onClick={() => removeLinhaItem(index)} className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-600 hover:text-white border-2 border-red-200 shadow-sm transition-all"><Trash2 size={16} /></button>)}
                        <div className="flex gap-3 items-end mb-3">
                          <div className="w-20"><label className="label-form text-xs">Qtd</label><input type="number" min="1" className="input-form text-center bg-gray-50 text-xl" value={item.qtd} onChange={(e) => atualizaItem(index, 'qtd', e.target.value)} /></div>
                          <div className="flex-1"><label className="label-form text-xs">Produto</label><select className="input-form text-lg h-[50px]" value={item.produtoId} onChange={(e) => selecionaProd(index, e.target.value)} required><option value="">Selecione...</option>{produtos.filter(p => p.tipo === 'principal').map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
                          <div className="w-28 relative"><label className="label-form text-xs">Valor</label><span className="absolute left-3 top-[34px] text-green-600 font-bold text-sm">R$</span><input type="number" step="0.50" className="input-form pl-10 text-green-700 h-[50px]" value={item.preco} onChange={(e) => atualizaItem(index, 'preco', e.target.value)} /></div>
                        </div>
                        {item.produtoId && produtos.find(p => p.id == item.produtoId)?.opcoes && (<div className="mt-2 pl-4 border-l-4 border-orange-300"><select className="w-full bg-orange-50 border border-orange-200 rounded p-2 text-sm font-bold text-orange-900 outline-none" value={item.opcaoSelecionada} onChange={(e) => atualizaItem(index, 'opcaoSelecionada', e.target.value)}>{produtos.find(p => p.id == item.produtoId).opcoes.split(',').map((op, i) => { const nome = extrairNomeOpcao(op); const val = extrairValorOpcao(op); return <option key={i} value={op.trim()}>{nome} {val > 0 ? `(+ R$ ${val.toFixed(2)})` : ''}</option>; })}</select></div>)}
                        {item.produtoId && adicionaisDisponiveis.length > 0 && (<div className="mt-3 pl-4 border-l-4 border-yellow-400 grid grid-cols-2 gap-2">{adicionaisDisponiveis.map(ad => (<label key={ad.id} className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer border transition font-bold ${item.listaAdicionais?.includes(ad.id) ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-50 border-gray-100 text-gray-500'}`}><input type="checkbox" className="rounded text-red-600" checked={item.listaAdicionais?.includes(ad.id) || false} onChange={() => toggleAdicional(index, ad.id)}/><span className="flex-1 truncate">{ad.nome}</span></label>))}</div>)}
                      </div>
                    );
                  })}
                  </div>
                  <button type="button" onClick={addLinhaItem} className="w-full py-3 bg-red-50 text-red-700 font-black uppercase tracking-wide flex items-center justify-center gap-2 mt-4 rounded-xl border-2 border-dashed border-red-200 hover:bg-red-100 transition"><Plus size={18} /> Adicionar Item</button>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-6 flex flex-col md:flex-row items-center gap-4"><label className="font-black text-gray-700 uppercase flex items-center gap-2 shrink-0"><Bike size={20}/> Entrega</label><div className="flex-1 w-full"><select className="w-full border-2 border-gray-200 rounded-lg p-2.5 bg-white font-bold outline-none" onChange={(e) => setFormPedido({...formPedido, taxaEntrega: e.target.value})} value={taxasFrete.some(t => t.valor == formPedido.taxaEntrega) ? formPedido.taxaEntrega : ''}><option value="0">Retirada (Grátis)</option>{taxasFrete.map(t => <option key={t.id} value={t.valor}>{t.nome} - R$ {t.valor.toFixed(2)}</option>)}<option value="">Personalizado</option></select></div><div className="w-32 relative shrink-0"><span className="absolute left-3 top-2.5 text-gray-400 font-bold">R$</span><input type="number" step="0.50" className="w-full border-2 border-gray-200 bg-white rounded-lg p-2.5 pl-10 font-black text-gray-800 outline-none" value={formPedido.taxaEntrega} onChange={(e) => setFormPedido({...formPedido, taxaEntrega: e.target.value})} /></div></div>
                <div className="mt-4 flex gap-4">
                    <div className="flex-1"><label className="label-form">Pagamento</label><select className="input-form" value={formPedido.pagamento} onChange={(e) => setFormPedido({...formPedido, pagamento: e.target.value})}><option>Dinheiro</option><option>PIX</option><option>Cartão Crédito</option><option>Cartão Débito</option></select></div>
                    <div className="w-32"><label className="label-form">Desconto %</label><input type="number" className="input-form text-center text-red-600" value={formPedido.desconto} onChange={(e) => setFormPedido({...formPedido, desconto: e.target.value})} placeholder="0" /></div>
                </div>
                <div className="mt-4"><label className="label-form">Obs</label><textarea className="input-form h-20 resize-none" value={formPedido.observacoes} onChange={(e) => setFormPedido({...formPedido, observacoes: e.target.value})} placeholder="..." /></div>
                <div className="mt-6 flex justify-between items-center bg-red-100 p-4 rounded-xl border border-red-200">
                   <div><span className="text-xs font-bold text-red-800 uppercase block">Total Final</span><div className="text-3xl font-black text-red-700">R$ {calcularTotalGeral(formPedido.itens, formPedido.taxaEntrega, formPedido.desconto).toFixed(2)}</div></div>
                   <button type="submit" className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black uppercase tracking-wide shadow-lg transform hover:scale-105 transition flex items-center gap-2"><CheckCircle size={24}/> {formPedido.id ? 'Salvar' : 'Lançar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .label-form { @apply block text-xs font-bold text-gray-500 mb-1 uppercase; }
        .input-form { @apply w-full border-2 border-gray-200 rounded-lg p-2.5 bg-white font-bold text-gray-800 outline-none focus:border-red-500 transition-colors; }
        .btn-icon { @apply p-2 rounded-lg transition border border-transparent hover:border-black/5 flex items-center justify-center; }
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
      `}</style>
    </div>
  );
}

export default App;