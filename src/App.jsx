import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, MapPin, User, CheckCircle, Utensils, 
  Plus, Trash2, Package, ClipboardList, Pencil, Settings, Bike, 
  MessageCircle, Map, DollarSign, History, Users, Calendar, 
  CreditCard, Box, Ban, RotateCcw, FileText, List, Clock, 
  GripVertical, Link, Percent, X, MessageSquare,
  Download, Upload, Database, TrendingUp
} from 'lucide-react';

// --- ESTILOS DE IMPRESSÃO (MANTIDO) ---
const printStyles = `
  /* Oculta o cupom na visualização normal do PC/Celular */
  #area-impressao {
    display: none;
  }

  /* Configurações exclusivas para quando mandar imprimir */
  @media print {
    #area-impressao { display: block; } /* Obriga a aparecer na impressão */
    
    @page { margin: 0; size: auto; }
    body * { visibility: hidden; height: 0; overflow: hidden; }
    
    #area-impressao, #area-impressao * { 
      visibility: visible; 
      height: auto; 
      overflow: visible; 
    }
    
    #area-impressao {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm; /* Largura da bobina térmica padrão */
      padding: 5px;
      font-family: 'Courier New', Courier, monospace;
      color: black;
      background: white;
    }
    
    .no-print { display: none !important; }
  }
`;

// --- COMPONENTE DE TIMER ---
const PedidoTimer = ({ timestampInicial, minutosPrevistos }) => {
  const [tempoRestante, setTempoRestante] = useState('--:--');
  // Mudança visual: Cores mais vibrantes no timer padrão
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
        // Mudança visual: Vermelho mais "ketchup"
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
  
  const dragItem = useRef();
  const dragOverItem = useRef();

  // --- UTILITÁRIOS ---
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

  // --- LÓGICA DE PREÇO NA OPÇÃO ---
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
  const [taxasFrete, setTaxasFrete] = useState(() => carregarDados('bestdog_taxas', [
    { id: 1, nome: "Bairro Vizinho", valor: 5.00 },
    { id: 2, nome: "Centro", valor: 8.00 },
  ]));
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

  // --- FUNÇÕES DE BACKUP ---
  const exportarBackup = () => {
    const dadosBackup = { data: new Date().toISOString(), sistema: 'BestDog_v1', produtos, clientes, pedidos, taxasFrete, configTempos };
    const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = href; link.download = `Backup_BestDog_${getDataHoje()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  const importarBackup = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (confirm("ATENÇÃO: Isso irá substituir TODOS os dados atuais pelos do backup. Deseja continuar?")) {
          localStorage.setItem('bestdog_produtos', JSON.stringify(json.produtos || []));
          localStorage.setItem('bestdog_clientes', JSON.stringify(json.clientes || []));
          localStorage.setItem('bestdog_pedidos', JSON.stringify(json.pedidos || []));
          localStorage.setItem('bestdog_taxas', JSON.stringify(json.taxasFrete || []));
          localStorage.setItem('bestdog_tempos', JSON.stringify(json.configTempos || {}));
          alert("Backup restaurado! Página recarregando..."); window.location.reload();
        }
      } catch (err) { alert("Erro ao ler backup."); }
    }; reader.readAsText(file);
  };

  // --- RANKING ---
  const getProdutosMaisVendidos = () => {
    const contagem = {};
    pedidos.filter(p => p.status === 'Concluido').forEach(pedido => {
      pedido.itens.forEach(item => { contagem[item.nome] = (contagem[item.nome] || 0) + Number(item.qtd); });
    });
    return Object.entries(contagem).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  };

  // --- FORMULÁRIOS ---
  const [formPedido, setFormPedido] = useState({
    id: null, nome: '', endereco: '', taxaEntrega: 0, pagamento: 'Dinheiro', observacoes: '', desconto: 0,
    tempoPreparo: 0, tempoDeslocamento: 0,
    itens: [{ produtoId: '', nome: '', qtd: 1, preco: 0, opcaoSelecionada: '', listaAdicionais: [] }] 
  });
  const [novoProduto, setNovoProduto] = useState({ nome: '', preco: '', estoque: '', opcoes: '', tipo: 'principal', categoria: 'Lanches', idsAdicionaisPermitidos: [] });
  const [novaTaxa, setNovaTaxa] = useState({ nome: '', valor: '' });
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', endereco: '', taxaFixa: '' });

  // --- DRAG AND DROP ---
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    let _produtos = [...produtos];
    const draggedItemContent = _produtos.splice(dragItem.current, 1)[0];
    _produtos.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null; dragOverItem.current = null;
    setProdutos(_produtos);
  };

  // --- HELPERS ---
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

  // --- IMPRESSÃO (CORRIGIDA) ---
  const imprimirComanda = (pedido) => {
    setPedidoParaImpressao(pedido);
    setTimeout(() => {
      window.print();
      setPedidoParaImpressao(null); 
    }, 300);
  };

  // --- CÁLCULO ---
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

  // --- PEDIDOS CRUD ---
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
    if (formPedido.id) { setPedidos(pedidos.map(p => p.id === formPedido.id ? pedidoFormatado : p)); } else { setPedidos([pedidoFormatado, ...pedidos]); }
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
  };
  const cancelarPedido = (id) => { if(confirm("Cancelar pedido?")) setPedidos(pedidos.map(p => p.id === id ? { ...p, status: 'Cancelado', data: getDataHoje() } : p)); };
  const registrarDevolucao = (id) => { 
    if(!confirm("Devolução?")) return;
    const pedido = pedidos.find(p => p.id === id); if (!pedido) return;
    const novosProdutos = [...produtos];
    pedido.itens.forEach(itemPedido => {
      const indexProd = novosProdutos.findIndex(p => p.id == itemPedido.produtoId);
      if (indexProd >= 0) novosProdutos[indexProd].estoque = (novosProdutos[indexProd].estoque || 0) + Number(itemPedido.qtd);
      const listaAdics = itemPedido.listaAdicionais || [];
      listaAdics.forEach(adId => { const indexAd = novosProdutos.findIndex(p => p.id == adId); if (indexAd >= 0) novosProdutos[indexAd].estoque = (novosProdutos[indexAd].estoque || 0) + Number(itemPedido.qtd); });
    });
    setProdutos(novosProdutos); setPedidos(pedidos.map(p => p.id === id ? { ...p, status: 'Cancelado' } : p)); 
  };
  const resetarSistema = () => { if(confirm("Apagar TUDO?")) { localStorage.clear(); window.location.reload(); } }

  // --- CRUD GERAL ---
  const salvarCliente = (e) => { e.preventDefault(); if (!novoCliente.nome) return; setClientes([...clientes, { id: Date.now(), nome: novoCliente.nome, telefone: novoCliente.telefone, endereco: novoCliente.endereco, taxaFixa: parseFloat(novoCliente.taxaFixa || 0) }]); setNovoCliente({ nome: '', telefone: '', endereco: '', taxaFixa: '' }); };
  const deletarCliente = (id) => setClientes(clientes.filter(c => c.id !== id));
  const salvarTaxa = (e) => { e.preventDefault(); if (!novaTaxa.nome) return; setTaxasFrete([...taxasFrete, { id: Date.now(), nome: novaTaxa.nome, valor: parseFloat(novaTaxa.valor) }]); setNovaTaxa({ nome: '', valor: '' }); };
  const deletarTaxa = (id) => setTaxasFrete(taxasFrete.filter(t => t.id !== id));
  const atualizarTaxaNaLista = (id, campo, valor) => { setTaxasFrete(taxasFrete.map(t => t.id === id ? { ...t, [campo]: campo === 'valor' ? Number(valor) : valor } : t)); };
  const salvarProduto = (e) => { 
    e.preventDefault(); if (!novoProduto.nome) return; 
    setProdutos([...produtos, { id: Date.now(), nome: novoProduto.nome, preco: parseFloat(novoProduto.preco), estoque: parseInt(novoProduto.estoque || 0), opcoes: novoProduto.opcoes, tipo: novoProduto.tipo, categoria: novoProduto.categoria, idsAdicionaisPermitidos: novoProduto.idsAdicionaisPermitidos || [] }]); 
    setNovoProduto({ nome: '', preco: '', estoque: '', opcoes: '', tipo: 'principal', idsAdicionaisPermitidos: [], categoria: 'Lanches' }); 
  };
  const deletarProduto = (id) => { if(confirm("Deletar?")) setProdutos(produtos.filter(p => p.id !== id)); };
  const atualizarProduto = (id, campo, valor) => { setProdutos(produtos.map(p => { if (p.id === id) { const valorFinal = (campo === 'preco' || campo === 'estoque') ? (valor === '' ? '' : Number(valor)) : valor; return { ...p, [campo]: valorFinal }; } return p; })); };

  // --- CONTROLES ---
  const abrirNovo = () => { setFormPedido({ id: null, nome: '', endereco: '', telefone: '', taxaEntrega: 0, desconto: 0, pagamento: 'Dinheiro', observacoes: '', tempoPreparo: Number(configTempos.preparo), tempoDeslocamento: Number(configTempos.deslocamento), itens: [{ produtoId: '', nome: '', qtd: 1, preco: 0, opcaoSelecionada: '', listaAdicionais: [] }] }); setModalAberto(true); };
  const abrirEdicao = (pedido) => { const itensClonados = pedido.itens.map(item => ({...item, listaAdicionais: [...(item.listaAdicionais || [])]})); setFormPedido({ id: pedido.id, nome: pedido.cliente.nome, endereco: pedido.cliente.endereco, telefone: pedido.cliente.telefone, taxaEntrega: pedido.taxaEntrega || 0, desconto: pedido.desconto || 0, pagamento: pedido.pagamento || 'Dinheiro', observacoes: pedido.observacoes || '', tempoPreparo: Number(pedido.tempoPreparo) || Number(configTempos.preparo), tempoDeslocamento: Number(pedido.tempoDeslocamento) || Number(configTempos.deslocamento), itens: itensClonados }); setModalAberto(true); };
  const selecionarCliente = (id) => { const c = clientes.find(cli => cli.id == id); if (c) setFormPedido({ ...formPedido, nome: c.nome, endereco: c.endereco, telefone: c.telefone, taxaEntrega: c.taxaFixa || 0 }); };
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
    // Mudança visual: Fundo geral mais quente (laranja claro)
    <div className="min-h-screen bg-orange-50 font-sans pb-20">
      <style>{printStyles}</style>
      
      {/* ÁREA DE IMPRESSÃO (MANTIDA IGUAL) */}
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
                    <td style={{padding:'8px 0', fontSize:'18px', fontWeight:'bold'}}>
                      {item.nome}
                      {nomeOpcao && <div style={{fontWeight:'normal', fontSize:'14px'}}>[{nomeOpcao}]</div>}
                      {adics.map(ad => <div key={ad.id} style={{fontSize:'14px', fontWeight:'normal', marginLeft:'5px'}}>+ {ad.nome}</div>)}
                    </td>
                    <td style={{padding:'8px 0', textAlign:'right', fontSize:'18px', fontWeight:'bold', verticalAlign:'top'}}>{totalItem}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pedidoParaImpressao.observacoes && (
            <div style={{margin:'15px 0', border:'2px solid black', padding:'5px', fontWeight:'900', fontSize:'18px', textAlign:'center', background:'#eee'}}>
              OBS: {pedidoParaImpressao.observacoes.toUpperCase()}
            </div>
          )}

          <div style={{borderBottom:'3px dashed black', margin:'10px 0'}}></div>

          <div style={{fontSize:'18px', fontWeight:'bold', lineHeight:'1.6'}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <span>Subtotal</span>
              <span>R$ {(pedidoParaImpressao.itens || []).reduce((acc, item) => {
                   const pb = Number(item.preco) || 0;
                   const adics = item.listaAdicionais || [];
                   const pa = adics.reduce((s, aid) => s + (produtos.find(p=>p.id==aid)?.preco || 0),0);
                   const pop = extrairValorOpcao(item.opcaoSelecionada);
                   return acc + ((pb+pa+pop) * (item.qtd||1));
                 },0).toFixed(2)}</span>
            </div>
            {pedidoParaImpressao.desconto > 0 && (
              <div style={{display:'flex', justifyContent:'space-between'}}>
                 <span>Desconto ({pedidoParaImpressao.desconto}%)</span>
                 <span>- R$ {((pedidoParaImpressao.itens || []).reduce((acc, item) => {
                       const pb = Number(item.preco) || 0;
                       const adics = item.listaAdicionais || [];
                       const pa = adics.reduce((s, aid) => s + (produtos.find(p=>p.id==aid)?.preco || 0),0);
                       const pop = extrairValorOpcao(item.opcaoSelecionada);
                       return acc + ((pb+pa+pop) * (item.qtd||1));
                     },0) * (pedidoParaImpressao.desconto/100)).toFixed(2)}</span>
              </div>
            )}
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Entrega</span><span>R$ {Number(pedidoParaImpressao.taxaEntrega).toFixed(2)}</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px'}}><span>Pagamento:</span><span>{pedidoParaImpressao.pagamento}</span></div>
          </div>

          <div style={{fontSize:'32px', fontWeight:'900', textAlign:'right', marginTop:'10px', borderTop:'3px solid black', paddingTop:'5px'}}>
            TOTAL: R$ {pedidoParaImpressao.total.toFixed(2)}
          </div>
          <br/><div style={{textAlign:'center', fontSize:'12px'}}>*** Obrigado pela preferência! ***</div>
        </div>
      )}
    
      <div className="max-w-6xl mx-auto p-4 md:p-8 no-print"> 
        {/* Mudança visual: Header vermelho vibrante tipo letreiro */}
        <header className="flex flex-col md:flex-row md:items-center justify-between bg-red-700 p-6 rounded-3xl shadow-lg border-b-8 border-red-900 mb-8">
          <div><h1 className="text-3xl md:text-4xl font-extrabold text-yellow-400 flex items-center gap-3 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"><Utensils className="text-white" size={32} /> BEST DOG</h1></div>
          {/* Mudança visual: Abas de navegação com cores de "fichas" */}
          <div className="flex bg-red-900/30 p-2 rounded-xl mt-4 md:mt-0 overflow-x-auto items-center gap-1">
            <button onClick={() => setAbaAtiva('pedidos')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap border-2 ${abaAtiva === 'pedidos' ? 'bg-yellow-400 text-red-900 border-yellow-600 shadow-sm' : 'bg-red-800 text-red-200 border-transparent hover:bg-red-700'}`}><ClipboardList size={18} /> Pedidos</button>
            <button onClick={() => setAbaAtiva('vendas')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap border-2 ${abaAtiva === 'vendas' ? 'bg-green-500 text-white border-green-700 shadow-sm' : 'bg-red-800 text-red-200 border-transparent hover:bg-red-700'}`}><DollarSign size={18} /> Caixa</button>
            <button onClick={() => setAbaAtiva('clientes')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap border-2 ${abaAtiva === 'clientes' ? 'bg-blue-400 text-blue-900 border-blue-600 shadow-sm' : 'bg-red-800 text-red-200 border-transparent hover:bg-red-700'}`}><Users size={18} /> Clientes</button>
            <button onClick={() => setAbaAtiva('produtos')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap border-2 ${abaAtiva === 'produtos' ? 'bg-orange-400 text-orange-900 border-orange-600 shadow-sm' : 'bg-red-800 text-red-200 border-transparent hover:bg-red-700'}`}><Package size={18} /> Produtos</button>
            <button onClick={() => setAbaAtiva('config')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap border-2 ${abaAtiva === 'config' ? 'bg-zinc-300 text-zinc-800 border-zinc-500 shadow-sm' : 'bg-red-800 text-red-200 border-transparent hover:bg-red-700'}`}><Settings size={18} /> Config</button>
            <button onClick={resetarSistema} className="ml-2 text-red-300 hover:text-white hover:bg-red-600 p-2 rounded-full transition" title="Resetar Sistema"><Trash2 size={16}/></button>
          </div>
        </header>

        {abaAtiva === 'pedidos' && (
          <>
            {/* Mudança visual: Botão Novo Pedido "Mostarda" */}
            <div className="flex justify-end mb-6"><button onClick={abrirNovo} className="bg-yellow-500 hover:bg-yellow-400 text-red-900 border-b-4 border-yellow-700 active:border-b-0 px-6 py-3 rounded-full font-black shadow-lg transition-all flex items-center gap-2 text-lg animate-bounce"><Plus size={24} /> NOVO PEDIDO</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pedidosPendentes.length === 0 && <div className="col-span-full text-center text-orange-400 py-10 font-bold text-xl italic">Nenhum dogão na chapa por enquanto...</div>}
              {pedidosPendentes.map((pedido) => (
                // Mudança visual: Cartão de pedido estilo "Comanda de papel"
                <div key={pedido.id} className="bg-yellow-50 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.2)] border-2 border-red-200 overflow-hidden hover:shadow-[6px_6px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 group relative">
                  {/* Cabeçalho da comanda (vermelho escuro) */}
                  <div className="bg-red-800 p-4 text-yellow-100 flex justify-between items-center border-b-4 border-red-900 relative overflow-hidden">
                    <span className="font-black text-2xl relative z-10">#{pedido.id}</span>
                    <div className="flex gap-2 relative z-10"><button onClick={() => abrirEdicao(pedido)} className="bg-red-900/50 hover:bg-yellow-400 hover:text-red-900 p-2 rounded-lg transition"><Pencil size={18} /></button><button onClick={() => {if(confirm("Excluir?")) setPedidos(pedidos.filter(p => p.id !== pedido.id))}} className="bg-red-900/50 hover:bg-red-600 text-white p-2 rounded-lg transition"><Trash2 size={18} /></button></div>
                    {/* Efeito visual de listras no fundo do header */}
                    <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]"></div>
                  </div>
                  <div className="p-5 relative">
                    {/* Efeito visual de papel amassado/textura */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/crumpled-paper.png')]"></div>
                    
                    <div className="mb-4 text-sm border-b-2 border-dashed border-red-200 pb-4">
                      <div className="flex items-center gap-2 text-red-900 font-black text-xl mb-1 uppercase"><User size={20} className="text-red-600" /> {pedido.cliente.nome}</div>
                      <div className="flex items-start justify-between gap-2 text-orange-800 mt-2 font-medium"><div className="flex items-start gap-2"><MapPin size={16} className="mt-1 shrink-0 text-red-500" /> <span className="leading-tight">{pedido.cliente.endereco}</span></div><button onClick={() => abrirNoMaps(pedido.cliente.endereco)} className="text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 p-2 rounded-full"><Map size={18} /></button></div>
                    </div>
                    {pedido.observacoes && (<div className="mb-4 bg-yellow-200 border-l-4 border-yellow-500 p-3 rounded-r text-sm text-yellow-900 flex items-start gap-2 shadow-sm"><FileText size={16} className="mt-1 shrink-0"/> <span className="font-bold italic">" {pedido.observacoes} "</span></div>)}
                    
                    <div className="mb-4 flex items-center justify-between gap-2 bg-orange-100 p-3 rounded-lg border-2 border-orange-200 shadow-inner">
                        <div className="text-xs text-orange-800 flex flex-col font-bold"><span>Cozinha: <b className="text-red-700 text-sm">{pedido.tempoPreparo}m</b></span><span>Entrega: <b className="text-red-700 text-sm">{pedido.tempoDeslocamento}m</b></span></div>
                        <PedidoTimer timestampInicial={pedido.timestamp} minutosPrevistos={(Number(pedido.tempoPreparo) + Number(pedido.tempoDeslocamento))} />
                    </div>

                    <div className="bg-white p-3 rounded-lg border-2 border-red-100 mb-5 shadow-sm relative">
                       {/* Efeito de "fita" no topo da lista de itens */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-100 text-red-800 text-[10px] font-bold px-3 py-1 rounded-full border border-red-200 uppercase tracking-wider">Itens do Pedido</div>
                      {pedido.itens.map((item, i) => {
                        const produtoPrincipal = produtos.find(p => p.id == item.produtoId);
                        if (!produtoPrincipal) return null;
                        const listaAdics = item.listaAdicionais || [];
                        const adics = listaAdics.map(id => produtos.find(p => p.id === id)).filter(Boolean);
                        const valorOpcao = extrairValorOpcao(item.opcaoSelecionada);
                        const nomeOpcao = extrairNomeOpcao(item.opcaoSelecionada);
                        return (
                          <div key={i} className="flex flex-col justify-between text-sm text-gray-800 py-2 border-b border-dashed border-red-200 last:border-0">
                            <div className="flex justify-between items-baseline"><span className="font-bold text-lg"><span className="text-red-600 bg-red-100 px-1 rounded mr-1">{item.qtd}x</span> {item.nome}</span><span className="text-gray-600 text-xs font-medium">({Number(item.preco).toFixed(2)})</span></div>
                            {nomeOpcao && (<div className="text-xs text-orange-800 pl-6 flex justify-between mt-1"><span>Opção: <strong>{nomeOpcao}</strong></span>{valorOpcao > 0 && <span className="text-green-700 font-bold">+R$ {valorOpcao.toFixed(2)}</span>}</div>)}
                            {adics.length > 0 && adics.map(ad => (<div key={ad.id} className="text-xs text-red-700 pl-6 font-bold flex justify-between mt-1"><span>+ {ad.nome}</span><span>+R$ {ad.preco.toFixed(2)}</span></div>))}
                          </div>
                        )
                      })}
                      {pedido.taxaEntrega > 0 && (<div className="flex justify-between text-sm text-orange-800 py-2 border-b border-dashed border-red-200 pt-3 font-medium"><span className="flex items-center gap-1"><Bike size={16} className="text-red-500"/> Entrega</span><span>R$ {Number(pedido.taxaEntrega).toFixed(2)}</span></div>)}
                      {pedido.desconto > 0 && (<div className="flex justify-between text-sm text-green-600 py-2 border-b border-dashed border-red-200 font-bold bg-green-50 px-2 rounded mt-1"><span className="flex items-center gap-1"><Percent size={16}/> Desconto ({pedido.desconto}%)</span><span>- R$ {(calcularTotalGeral(pedido.itens, 0, 0) * (pedido.desconto/100)).toFixed(2)}</span></div>)}
                      <div className="flex justify-between text-sm text-gray-700 py-2 border-b border-dashed border-red-200 font-medium"><span className="flex items-center gap-1"><CreditCard size={16} className="text-blue-500"/> {pedido.pagamento}</span></div>
                      <div className="mt-4 pt-3 border-t-4 border-double border-red-200 flex justify-between items-center bg-yellow-100 p-2 rounded-lg"><span className="text-sm text-red-800 uppercase font-black tracking-wider">Total a Pagar</span><span className="font-black text-2xl text-red-700">R$ {pedido.total.toFixed(2)}</span></div>
                    </div>
                    {/* Botões de ação estilo "carimbo" */}
                    <div className="grid grid-cols-3 gap-3 mb-4"><button onClick={() => imprimirComanda(pedido)} className="flex flex-col items-center justify-center gap-1 bg-zinc-100 border-2 border-zinc-300 text-zinc-700 py-2 px-2 rounded-lg hover:border-zinc-500 hover:bg-zinc-200 transition font-bold text-xs uppercase"><Printer size={20} /> Imprimir</button><button onClick={() => enviarParaMotoboy(pedido)} className="flex flex-col items-center justify-center gap-1 bg-green-100 text-green-800 border-2 border-green-300 py-2 px-2 rounded-lg hover:bg-green-200 transition font-bold text-xs uppercase"><Bike size={20} /> Motoboy</button><button onClick={() => enviarParaCliente(pedido)} className="flex flex-col items-center justify-center gap-1 bg-blue-100 text-blue-800 border-2 border-blue-300 py-2 px-2 rounded-lg hover:bg-blue-200 transition font-bold text-xs uppercase"><MessageSquare size={20} /> Zap</button></div>
                    {/* Botões principais robustos */}
                    <div className="flex gap-3"><button onClick={() => cancelarPedido(pedido.id)} className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-700 border-2 border-red-200 py-3 px-2 rounded-xl hover:bg-red-200 hover:border-red-300 transition font-bold text-sm uppercase"><Ban size={18} /> Cancelar</button><button onClick={() => concluirPedido(pedido.id)} className="flex-[2] flex items-center justify-center gap-2 bg-green-500 text-white border-b-4 border-green-700 py-3 px-4 rounded-xl hover:bg-green-400 active:border-b-0 active:translate-y-[4px] shadow-md transition-all font-black text-base uppercase tracking-wide"><CheckCircle size={22} /> CONCLUIR PEDIDO</button></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ABA VENDAS (Estilo Caixa Registradora) */}
        {abaAtiva === 'vendas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-md border-2 border-green-200">
              <div className="flex items-center gap-3 text-green-800"><Calendar size={28} className="text-green-600"/><span className="font-black text-xl">Movimento do Dia:</span></div>
              <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="border-2 border-green-300 rounded-lg p-2 font-bold text-green-800 bg-green-50 focus:ring-2 focus:ring-green-500 outline-none"/>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center border-4 border-green-800 relative overflow-hidden">
              <div className="relative z-10"><h2 className="text-green-100 font-bold mb-2 text-lg uppercase tracking-wider">Faturamento (Vendas Reais)</h2><div className="text-5xl font-black drop-shadow-md">R$ {totalVendasDia.toFixed(2)}</div><p className="text-green-100 mt-3 font-medium bg-green-800/30 py-1 px-3 rounded-full inline-block">{pedidosHistorico.filter(p => p.status === 'Concluido').length} vendas realizadas hoje</p></div>
              <div className="bg-white/20 p-5 rounded-full mt-6 md:mt-0 relative z-10 shadow-inner border-4 border-white/10"><DollarSign size={48} className="text-white drop-shadow" /></div>
              {/* Padrão de fundo sutil de cifrão */}
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRaPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJfeTB1dCI+PHBhdGggZD0iTTEyIDJ2MjBNMTcgNWgtOTVhMy41IDMuNSAwIDAgMCAwIDdoNWEzLjUgMy41IDAgMCAxIDAgN2gtNiIvPjwvc3ZnPg==')] bg-repeat space-x-4 space-y-4 rotate-12 scale-150"></div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-orange-200 mb-6">
              <h2 className="text-xl font-black text-orange-800 flex items-center gap-3 mb-6 uppercase"><TrendingUp size={24} className="text-orange-600"/> Top 5 Mais Vendidos (Geral)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {getProdutosMaisVendidos().length > 0 ? getProdutosMaisVendidos().map((prod, idx) => (<div key={idx} className="bg-orange-50 border-2 border-orange-200 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"><div className="absolute top-0 left-0 bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-br-lg">#{idx + 1}</div><div className="text-3xl font-black text-orange-600 mt-2">{idx + 1}º</div><div className="font-black text-gray-800 text-base mt-1 leading-tight">{prod.nome}</div><div className="text-sm text-orange-700 font-medium bg-orange-100 px-3 py-1 rounded-full mt-3">{prod.qtd} unidades</div></div>)) : (<div className="col-span-5 text-center text-gray-400 py-6 font-medium italic bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">Nenhuma venda concluída ainda para gerar ranking.</div>)}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden">
              <div className="bg-gray-100 p-4 border-b-2 border-gray-200 flex justify-between items-center"><h2 className="text-xl font-black text-gray-700 flex items-center gap-3 uppercase"><History size={24}/> Detalhamento do Dia</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left"><thead className="bg-gray-200 text-gray-700 text-sm uppercase font-black"><tr><th className="p-4">ID</th><th className="p-4">Hora</th><th className="p-4">Cliente</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4 text-right">Ação</th></tr></thead><tbody className="divide-y-2 divide-gray-100">{pedidosHistorico.slice().reverse().map((pedido) => (<tr key={pedido.id} className={`hover:bg-gray-50 transition font-medium ${pedido.status === 'Cancelado' ? 'opacity-60 bg-gray-50' : ''}`}><td className="p-4 font-black text-gray-700">#{pedido.id}</td><td className="p-4 text-gray-600">{pedido.hora}</td><td className="p-4 font-bold text-gray-800">{pedido.cliente.nome}</td><td className={`p-4 font-black text-lg ${pedido.status === 'Cancelado' ? 'text-red-400 line-through' : 'text-green-600'}`}>R$ {pedido.total.toFixed(2)}</td><td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${pedido.status === 'Concluido' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>{pedido.status}</span></td><td className="p-4 text-right">{pedido.status === 'Concluido' && (<button onClick={() => registrarDevolucao(pedido.id)} className="text-red-600 hover:text-red-800 text-xs font-bold border-2 border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1 ml-auto uppercase transition"><RotateCcw size={14}/> Devolução</button>)}</td></tr>))}</tbody></table>
              </div>
            </div>
          </div>
        )}

        {/* ABA CLIENTES (Estilo Agenda) */}
        {abaAtiva === 'clientes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-blue-200 h-fit"><h2 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-3 uppercase"><Plus size={24} className="text-blue-600"/> Novo Cliente</h2>
              <form onSubmit={salvarCliente} className="space-y-4">
                <div><label className="block text-sm font-bold text-blue-800 mb-1 uppercase">Nome</label><input required type="text" className="w-full border-2 border-blue-300 rounded-xl p-3 bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={novoCliente.nome} onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-blue-800 mb-1 uppercase">Telefone</label><input type="text" className="w-full border-2 border-blue-300 rounded-xl p-3 bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={novoCliente.telefone} onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-blue-800 mb-1 uppercase">Endereço Completo</label><input required type="text" className="w-full border-2 border-blue-300 rounded-xl p-3 bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={novoCliente.endereco} onChange={(e) => setNovoCliente({...novoCliente, endereco: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-blue-800 mb-1 uppercase">Frete Fixo (Opcional)</label><div className="relative"><span className="absolute left-3 top-3 text-blue-500 font-bold">R$</span><input type="number" step="0.50" className="w-full border-2 border-blue-300 rounded-xl p-3 pl-10 bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-900" value={novoCliente.taxaFixa} onChange={(e) => setNovoCliente({...novoCliente, taxaFixa: e.target.value})} /></div></div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white border-b-4 border-blue-800 active:border-b-0 active:translate-y-[4px] py-3 rounded-xl font-black uppercase tracking-wide transition-all shadow-md mt-4">Salvar Cliente</button>
              </form></div>
              <div className="md:col-span-2 bg-white rounded-2xl shadow-md border-2 border-blue-200 overflow-hidden"><div className="bg-blue-50 p-4 border-b-2 border-blue-200"><h2 className="text-xl font-black text-blue-900 flex items-center gap-3 uppercase"><Users size={24}/> Base de Clientes</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-blue-100 text-blue-900 text-sm uppercase font-black"><tr><th className="p-4">Nome</th><th className="p-4">Endereço</th><th className="p-4">Frete Fixo</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y-2 divide-blue-50">{clientes.map((cli) => (<tr key={cli.id} className="hover:bg-blue-50 transition"><td className="p-4"><div className="font-black text-lg text-blue-900">{cli.nome}</div><div className="text-sm font-medium text-blue-600 flex items-center gap-1"><MessageCircle size={14}/>{cli.telefone}</div></td><td className="p-4 text-sm font-medium text-gray-700 flex items-start gap-1"><MapPin size={16} className="text-blue-400 shrink-0 mt-1"/>{cli.endereco}</td><td className="p-4 font-black text-green-600 text-lg">{cli.taxaFixa ? `R$ ${Number(cli.taxaFixa).toFixed(2)}` : '-'}</td><td className="p-4 text-right"><button onClick={() => deletarCliente(cli.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition border-2 border-transparent hover:border-red-200"><Trash2 size={20} /></button></td></tr>))}</tbody></table></div></div>
          </div>
        )}

        {/* ABA PRODUTOS (Estilo Cardápio) */}
        {abaAtiva === 'produtos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-red-200 h-fit">
                <h2 className="text-xl font-black text-red-900 mb-6 flex items-center gap-3 uppercase"><Plus size={24} className="text-red-600"/> Novo Item do Cardápio</h2>
                <form onSubmit={salvarProduto} className="space-y-4">
                  <div className="flex gap-3 mb-6 p-1 bg-gray-100 rounded-xl">
                    <button type="button" onClick={() => setNovoProduto({...novoProduto, tipo: 'principal'})} className={`flex-1 py-3 rounded-lg text-sm font-black uppercase tracking-wide transition-all ${novoProduto.tipo === 'principal' ? 'bg-red-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>Item Principal</button>
                    <button type="button" onClick={() => setNovoProduto({...novoProduto, tipo: 'adicional'})} className={`flex-1 py-3 rounded-lg text-sm font-black uppercase tracking-wide transition-all ${novoProduto.tipo === 'adicional' ? 'bg-yellow-500 text-red-900 shadow-md' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>Adicional / Extra</button>
                  </div>
                  <div><label className="block text-sm font-bold text-red-800 mb-1 uppercase">Nome do Item</label><input required type="text" className="w-full border-2 border-red-300 rounded-xl p-3 bg-red-50 focus:ring-2 focus:ring-red-500 outline-none font-bold" value={novoProduto.nome} onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold text-red-800 mb-1 uppercase">Preço (R$)</label><div className="relative"><span className="absolute left-3 top-3 text-red-500 font-bold">R$</span><input required type="number" step="0.50" className="w-full border-2 border-red-300 rounded-xl p-3 pl-10 bg-red-50 focus:ring-2 focus:ring-red-500 outline-none font-bold text-red-900 text-lg" value={novoProduto.preco} onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})} /></div></div>
                  {novoProduto.tipo === 'principal' && (
                    <>
                     <div><label className="block text-sm font-bold text-red-800 mb-1 uppercase">Categoria</label><select className="w-full border-2 border-red-300 rounded-xl p-3 bg-red-50 focus:ring-2 focus:ring-red-500 outline-none font-bold text-red-900" value={novoProduto.categoria} onChange={(e) => setNovoProduto({...novoProduto, categoria: e.target.value})}><option value="Lanches">Lanches 🌭</option><option value="Bebidas">Bebidas 🥤</option><option value="Combos">Combos 🍟</option><option value="Sobremesas">Sobremesas 🍦</option><option value="Outros">Outros</option></select></div>
                     <div><label className="block text-sm font-bold text-red-800 mb-1 flex items-center gap-2 uppercase"><List size={18}/> Opções (Ex: Molho=+2.00)</label><input type="text" className="w-full border-2 border-red-300 rounded-xl p-3 bg-red-50 focus:ring-2 focus:ring-red-500 outline-none font-bold placeholder-red-300" value={novoProduto.opcoes} onChange={(e) => setNovoProduto({...novoProduto, opcoes: e.target.value})} placeholder="Ex: Vinagrete, Cheddar=+2.00" /></div>
                     <div className="mt-4 border-t-2 border-dashed border-red-200 pt-4">
                       <label className="block text-sm font-bold text-red-800 mb-3 flex items-center gap-2 uppercase"><Link size={18}/> Adicionais Permitidos:</label>
                       <div className="max-h-48 overflow-y-auto border-2 border-red-200 rounded-xl p-2 bg-red-50/50 grid grid-cols-2 gap-2">
                         {produtos.filter(p => p.tipo === 'adicional').map(ad => (<label key={ad.id} className={`flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer transition font-bold border-2 ${novoProduto.idsAdicionaisPermitidos?.includes(ad.id) ? 'bg-yellow-100 border-yellow-400 text-red-900' : 'bg-white border-red-100 text-gray-600 hover:border-red-300'}`}><input type="checkbox" checked={novoProduto.idsAdicionaisPermitidos?.includes(ad.id) || false} onChange={() => toggleAdicionalNoCadastro(ad.id)} className="text-red-600 rounded-md w-5 h-5 border-2 border-red-300 focus:ring-red-500"/><span className="flex-1 truncate">{ad.nome}</span></label>))}
                         {produtos.filter(p => p.tipo === 'adicional').length === 0 && <span className="text-sm text-red-400 col-span-2 text-center italic p-2">Nenhum adicional cadastrado.</span>}
                       </div>
                     </div>
                    </>
                  )}
                  <div><label className="block text-sm font-bold text-red-800 mb-1 uppercase">Estoque Inicial</label><div className="flex items-center gap-2"><Box size={18} className="text-red-500"/><input type="number" className="w-full border-2 border-red-300 rounded-xl p-3 bg-red-50 focus:ring-2 focus:ring-red-500 outline-none font-bold text-red-900" value={novoProduto.estoque} onChange={(e) => setNovoProduto({...novoProduto, estoque: e.target.value})} placeholder="0"/></div></div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white border-b-4 border-red-800 active:border-b-0 active:translate-y-[4px] py-3 rounded-xl font-black uppercase tracking-wide transition-all shadow-md mt-6 text-lg">Salvar no Cardápio</button>
                </form>
              </div>

              <div className="md:col-span-2 bg-white rounded-2xl shadow-md border-2 border-gray-300 overflow-hidden">
                <div className="bg-gray-100 p-4 border-b-2 border-gray-300 flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="text-xl font-black text-gray-800 flex items-center gap-3 uppercase"><ClipboardList size={24}/> Cardápio Atual</h2>
                  <div className="flex gap-2 p-1 bg-gray-200 rounded-lg">
                    <button onClick={() => setTipoCadastro('lanches')} className={`px-4 py-2 rounded-md text-sm font-black uppercase transition-all ${tipoCadastro === 'lanches' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Lanches & Bebidas</button>
                    <button onClick={() => setTipoCadastro('adicionais')} className={`px-4 py-2 rounded-md text-sm font-black uppercase transition-all ${tipoCadastro === 'adicionais' ? 'bg-yellow-500 text-red-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>Adicionais</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-200 text-gray-700 text-sm uppercase font-black"><tr><th className="p-4 w-10"></th><th className="p-4">Tipo</th><th className="p-4">Item</th><th className="p-4">Preço</th><th className="p-4">Estoque</th><th className="p-4 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y-2 divide-gray-100">
                      {tipoCadastro === 'lanches' ? ([...new Set(produtos.filter(p => p.tipo !== 'adicional').map(p => p.categoria || 'Geral'))].map(cat => (
                            <React.Fragment key={cat}>
                               <tr className="bg-red-50"><td colSpan="6" className="p-3 pl-4 font-black text-red-800 text-sm uppercase tracking-wider border-t-2 border-red-100 flex items-center gap-2"><Utensils size={16}/> {cat}</td></tr>
                               {produtos.filter(p => p.tipo !== 'adicional' && (p.categoria || 'Geral') === cat).map((prod, index) => (
                                  <tr key={prod.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} className="hover:bg-gray-50 transition cursor-move group bg-white">
                                    <td className="p-4 text-gray-300 group-hover:text-gray-500"><GripVertical size={20}/></td><td className="p-4"><span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-bold uppercase border border-red-200">Principal</span></td><td className="p-4 font-bold text-gray-800 text-lg"><input type="text" value={prod.nome} onChange={(e) => atualizarProduto(prod.id, 'nome', e.target.value)} className="bg-transparent border-2 border-transparent hover:border-gray-300 focus:border-red-300 focus:bg-red-50 rounded-lg px-2 py-1 w-full outline-none transition font-bold"/></td><td className="p-4"><div className="relative"><span className="absolute left-2 top-1.5 text-green-500 font-bold text-sm">R$</span><input type="number" step="0.50" value={prod.preco} onChange={(e) => atualizarProduto(prod.id, 'preco', e.target.value)} className="bg-transparent border-2 border-transparent hover:border-gray-300 focus:border-green-300 focus:bg-green-50 rounded-lg pl-8 pr-2 py-1 w-28 font-black text-green-600 text-lg outline-none transition"/></div></td><td className="p-4"><div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg border-2 border-gray-200 group-hover:border-gray-300 transition"><Box size={16} className="text-gray-500"/><input type="number" value={prod.estoque || ''} onChange={(e) => atualizarProduto(prod.id, 'estoque', e.target.value)} className="bg-transparent rounded px-1 py-0.5 w-16 outline-none transition font-bold text-center text-gray-700"/></div></td><td className="p-4 text-right"><button onClick={() => deletarProduto(prod.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition border-2 border-transparent hover:border-red-200"><Trash2 size={20} /></button></td>
                                  </tr>
                               ))}
                            </React.Fragment>
                         ))) : (
                         <>
                         <tr className="bg-yellow-50"><td colSpan="6" className="p-3 pl-4 font-black text-yellow-800 text-sm uppercase tracking-wider border-t-2 border-yellow-100 flex items-center gap-2"><Plus size={16}/> Adicionais / Complementos</td></tr>
                         {produtos.filter(p => p.tipo === 'adicional').map((prod, index) => (
                           <tr key={prod.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} className="hover:bg-gray-50 transition cursor-move group bg-white">
                             <td className="p-4 text-gray-300 group-hover:text-gray-500"><GripVertical size={20}/></td><td className="p-4"><span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-bold uppercase border border-yellow-200">Adicional</span></td><td className="p-4 font-bold text-gray-800 text-lg"><input type="text" value={prod.nome} onChange={(e) => atualizarProduto(prod.id, 'nome', e.target.value)} className="bg-transparent border-2 border-transparent hover:border-gray-300 focus:border-yellow-300 focus:bg-yellow-50 rounded-lg px-2 py-1 w-full outline-none transition font-bold"/></td><td className="p-4"><div className="relative"><span className="absolute left-2 top-1.5 text-green-500 font-bold text-sm">R$</span><input type="number" step="0.50" value={prod.preco} onChange={(e) => atualizarProduto(prod.id, 'preco', e.target.value)} className="bg-transparent border-2 border-transparent hover:border-gray-300 focus:border-green-300 focus:bg-green-50 rounded-lg pl-8 pr-2 py-1 w-28 font-black text-green-600 text-lg outline-none transition"/></div></td><td className="p-4"><div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg border-2 border-gray-200 group-hover:border-gray-300 transition"><Box size={16} className="text-gray-500"/><input type="number" value={prod.estoque || ''} onChange={(e) => atualizarProduto(prod.id, 'estoque', e.target.value)} className="bg-transparent rounded px-1 py-0.5 w-16 outline-none transition font-bold text-center text-gray-700"/></div></td><td className="p-4 text-right"><button onClick={() => deletarProduto(prod.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition border-2 border-transparent hover:border-red-200"><Trash2 size={20} /></button></td>
                           </tr>
                         ))}
                         </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        )}

        {/* ABA CONFIG (Estilo Industrial/Cozinha) */}
        {abaAtiva === 'config' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-zinc-300 h-fit"><h2 className="text-xl font-black text-zinc-800 mb-6 flex items-center gap-3 uppercase"><Bike size={24} className="text-red-600"/> Nova Taxa de Entrega</h2><form onSubmit={salvarTaxa} className="space-y-4"><div><label className="block text-sm font-bold text-zinc-700 mb-1 uppercase">Descrição da Zona</label><input required type="text" className="w-full border-2 border-zinc-300 rounded-xl p-3 bg-zinc-50 focus:ring-2 focus:ring-zinc-500 outline-none font-bold" value={novaTaxa.nome} onChange={(e) => setNovaTaxa({...novaTaxa, nome: e.target.value})} placeholder="Ex: Bairro Centro" /></div><div><label className="block text-sm font-bold text-zinc-700 mb-1 uppercase">Valor (R$)</label><input required type="number" step="0.50" className="w-full border-2 border-zinc-300 rounded-xl p-3 bg-zinc-50 focus:ring-2 focus:ring-zinc-500 outline-none font-bold text-lg" value={novaTaxa.valor} onChange={(e) => setNovaTaxa({...novaTaxa, valor: e.target.value})} /></div><button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border-b-4 border-black active:border-b-0 active:translate-y-[4px] py-3 rounded-xl font-black uppercase tracking-wide transition-all shadow-md mt-4">Salvar Taxa</button></form></div>
              <div className="md:col-span-2 bg-white rounded-2xl shadow-md border-2 border-zinc-300 overflow-hidden"><div className="bg-zinc-100 p-4 border-b-2 border-zinc-300"><h2 className="text-xl font-black text-zinc-800 flex items-center gap-3 uppercase"><Settings size={24}/> Configurações da Cozinha</h2></div>
                <div className="p-6 bg-zinc-50 flex flex-col md:flex-row gap-6 mb-4 border-b-2 border-zinc-200 dashed">
                   <div className="flex-1 bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-sm"><label className="block text-sm font-black text-zinc-700 mb-2 uppercase flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Tempo Preparo Padrão (min)</label><input type="number" className="w-full border-2 border-zinc-300 rounded-lg p-3 font-bold text-xl text-center text-orange-600 focus:border-orange-500 outline-none bg-orange-50" value={configTempos.preparo} onChange={(e) => setConfigTempos({...configTempos, preparo: e.target.value})} /></div>
                   <div className="flex-1 bg-white p-4 rounded-xl border-2 border-zinc-200 shadow-sm"><label className="block text-sm font-black text-zinc-700 mb-2 uppercase flex items-center gap-2"><Bike size={16} className="text-blue-500"/> Tempo Trajeto Padrão (min)</label><input type="number" className="w-full border-2 border-zinc-300 rounded-lg p-3 font-bold text-xl text-center text-blue-600 focus:border-blue-500 outline-none bg-blue-50" value={configTempos.deslocamento} onChange={(e) => setConfigTempos({...configTempos, deslocamento: e.target.value})} /></div>
                </div>
                <div className="overflow-x-auto p-4"><table className="w-full text-left border-2 border-zinc-200 rounded-xl overflow-hidden"><thead className="bg-zinc-200 text-zinc-700 text-sm uppercase font-black"><tr><th className="p-4">Zona de Entrega</th><th className="p-4">Valor</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y-2 divide-zinc-100 bg-white">{taxasFrete.map((taxa) => (<tr key={taxa.id} className="hover:bg-zinc-50 transition"><td className="p-4 font-bold text-zinc-800"><input type="text" value={taxa.nome} onChange={(e) => atualizarTaxaNaLista(taxa.id, 'nome', e.target.value)} className="bg-transparent border-2 border-transparent hover:border-zinc-300 focus:border-zinc-500 focus:bg-zinc-50 rounded-lg px-2 py-1 w-full outline-none transition font-bold"/></td><td className="p-4"><div className="relative"><span className="absolute left-2 top-1.5 text-green-500 font-bold text-sm">R$</span><input type="number" step="0.50" value={taxa.valor} onChange={(e) => atualizarTaxaNaLista(taxa.id, 'valor', e.target.value)} className="bg-transparent border-2 border-transparent hover:border-zinc-300 focus:border-green-500 focus:bg-green-50 rounded-lg pl-8 pr-2 py-1 w-28 font-black text-green-600 text-lg outline-none transition"/></div></td><td className="p-4 text-right"><button onClick={() => deletarTaxa(taxa.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition border-2 border-transparent hover:border-red-200"><Trash2 size={20} /></button></td></tr>))}</tbody></table></div></div>
            </div>
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-md border-2 border-blue-300">
              <h2 className="text-xl font-black text-blue-900 mb-4 flex items-center gap-3 uppercase"><Database size={24} className="text-blue-600"/> Segurança & Backup</h2>
              <p className="text-sm font-medium text-blue-700 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">⚠️ Seus dados ficam salvos apenas neste navegador. Faça backups (cópias) frequentes para garantir a segurança das suas informações.</p>
              <div className="flex flex-col md:flex-row gap-4">
                <button onClick={exportarBackup} className="flex-1 flex items-center justify-center gap-3 bg-blue-50 text-blue-800 border-2 border-blue-200 py-4 rounded-xl font-black hover:bg-blue-100 hover:border-blue-300 transition uppercase tracking-wide shadow-sm"><Download size={24}/> Baixar Backup (Salvar)</button>
                <div className="flex-1 relative group">
                  <input type="file" accept=".json" onChange={importarBackup} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                  <button className="w-full flex items-center justify-center gap-3 bg-zinc-50 text-zinc-800 border-2 border-zinc-200 py-4 rounded-xl font-black group-hover:bg-zinc-100 group-hover:border-zinc-300 transition uppercase tracking-wide shadow-sm pointer-events-none"><Upload size={24}/> Restaurar Backup (Carregar)</button>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* MODAL DE PEDIDO (Estilo Balcão) */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-orange-50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in border-4 border-red-800/50 relative">
              {/* Textura de fundo sutil */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
              <div className={`p-5 flex justify-between items-center text-white ${formPedido.id ? 'bg-blue-600' : 'bg-red-700'} border-b-4 border-black/20 relative z-10`}>
                <h2 className="font-black text-2xl flex items-center gap-3 uppercase drop-shadow-md">{formPedido.id ? <><Pencil size={28}/> Editar Pedido #{formPedido.id}</> : <><Plus size={28}/> Anotar Novo Pedido</>}</h2>
                <button onClick={() => setModalAberto(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X size={28} /></button>
              </div>
              <form onSubmit={salvarPedido} className="p-6 max-h-[80vh] overflow-y-auto relative z-10">
                {!formPedido.id && (<div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"><label className="block text-xs font-black text-blue-800 mb-2 uppercase flex items-center gap-1"><User size={14}/> Já é cliente da casa?</label><select className="w-full border-2 border-blue-300 rounded-lg p-3 bg-white text-blue-900 font-bold outline-none focus:border-blue-500" onChange={(e) => selecionarCliente(e.target.value)} defaultValue=""><option value="">Selecione um cliente cadastrado...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.endereco}</option>)}</select></div>)}
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                     <div className="flex-1"><label className="block text-sm font-bold text-red-800 mb-1 uppercase">Nome do Cliente</label><input required type="text" className="w-full border-2 border-red-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-red-500 outline-none font-bold" value={formPedido.nome} onChange={(e) => setFormPedido({...formPedido, nome: e.target.value})} placeholder="Ex: João do Dog"/></div>
                     <div className="flex-[2]"><label className="block text-sm font-bold text-red-800 mb-1 uppercase">Endereço</label><input required type="text" className="w-full border-2 border-red-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-red-500 outline-none font-bold" value={formPedido.endereco} onChange={(e) => setFormPedido({...formPedido, endereco: e.target.value})} placeholder="Rua dos Sabores, 123" /></div>
                  </div>
                  
                  <div className="flex gap-4 bg-orange-100/50 p-4 rounded-xl border-2 border-orange-200 dashed">
                      <div className="flex-1"><label className="block text-xs font-black text-orange-800 mb-2 uppercase flex items-center gap-1"><Clock size={14}/> Tempo Cozinha (min)</label><input type="number" className="w-full border-2 border-orange-300 rounded-lg p-2 bg-white font-bold text-center text-lg text-orange-700 outline-none focus:border-orange-500" value={formPedido.tempoPreparo} onChange={(e) => setFormPedido({...formPedido, tempoPreparo: e.target.value})} /></div>
                      <div className="flex-1"><label className="block text-xs font-black text-orange-800 mb-2 uppercase flex items-center gap-1"><Bike size={14}/> Tempo Trajeto (min)</label><input type="number" className="w-full border-2 border-orange-300 rounded-lg p-2 bg-white font-bold text-center text-lg text-orange-700 outline-none focus:border-orange-500" value={formPedido.tempoDeslocamento} onChange={(e) => setFormPedido({...formPedido, tempoDeslocamento: e.target.value})} /></div>
                  </div>
                  <div className="border-t-4 border-double border-red-200 pt-6 mt-6">
                    <label className="block text-lg font-black text-red-900 mb-4 uppercase flex items-center gap-2"><ClipboardList size={24} className="text-red-600"/> Itens do Pedido</label>
                    <div className="space-y-4">
                    {formPedido.itens.map((item, index) => {
                      const produtoPrincipal = produtos.find(p => p.id == item.produtoId);
                      const idsPermitidos = produtoPrincipal?.idsAdicionaisPermitidos || [];
                      const adicionaisDisponiveis = produtos.filter(p => p.tipo === 'adicional' && idsPermitidos.includes(p.id));
                      return (
                        <div key={index} className="bg-white p-4 rounded-xl border-2 border-red-100 shadow-sm relative group-hover:border-red-300 transition-all">
                           {formPedido.itens.length > 1 && (<button type="button" onClick={() => removeLinhaItem(index)} className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-600 hover:text-white border-2 border-red-200 shadow-sm transition-all"><Trash2 size={18} /></button>)}
                          <div className="flex flex-col sm:flex-row gap-3 items-end mb-3">
                            <div className="w-full sm:w-20"><label className="text-xs text-red-600 font-bold uppercase mb-1 block">Qtd</label><input type="number" min="1" className="w-full border-2 border-red-200 bg-red-50 rounded-lg p-2 text-center font-black text-xl text-red-800 outline-none focus:border-red-500" value={item.qtd} onChange={(e) => atualizaItem(index, 'qtd', e.target.value)} /></div>
                            <div className="flex-1 w-full"><label className="text-xs text-red-600 font-bold uppercase mb-1 block">Produto Principal</label><select className="w-full border-2 border-red-200 rounded-lg p-2.5 bg-white font-bold text-gray-800 outline-none focus:border-red-500 text-lg" value={item.produtoId} onChange={(e) => selecionaProd(index, e.target.value)} required><option value="">Selecione o lanche...</option>{produtos.filter(p => p.tipo === 'principal').map(p => <option key={p.id} value={p.id}>{p.nome} ({p.estoque || 0} un)</option>)}</select></div>
                            <div className="w-full sm:w-32 relative"><label className="text-xs text-green-600 font-bold uppercase mb-1 block">Preço Unit.</label><span className="absolute left-3 top-[34px] text-green-600 font-bold text-sm">R$</span><input type="number" step="0.50" className="w-full border-2 border-green-200 bg-green-50 rounded-lg p-2.5 pl-10 font-black text-lg text-green-700 outline-none focus:border-green-500" value={item.preco} onChange={(e) => atualizaItem(index, 'preco', e.target.value)} /></div>
                          </div>
                          {item.produtoId && produtos.find(p => p.id == item.produtoId)?.opcoes && (<div className="mt-3 pl-4 border-l-4 border-orange-300 bg-orange-50 p-3 rounded-r-lg"><label className="block text-xs font-black text-orange-800 mb-2 uppercase flex items-center gap-1"><List size={14}/> Opção do Lanche:</label><select className="w-full border-2 border-orange-200 bg-white rounded-lg p-2 font-bold text-orange-900 outline-none focus:border-orange-500" value={item.opcaoSelecionada} onChange={(e) => atualizaItem(index, 'opcaoSelecionada', e.target.value)}>{produtos.find(p => p.id == item.produtoId).opcoes.split(',').map((op, i) => { const nome = extrairNomeOpcao(op); const val = extrairValorOpcao(op); return <option key={i} value={op.trim()}>{nome} {val > 0 ? `(+ R$ ${val.toFixed(2)})` : ''}</option>; })}</select></div>)}
                          {item.produtoId && adicionaisDisponiveis.length > 0 && (<div className="mt-3 pl-4 border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-r-lg"><span className="block text-xs font-black text-yellow-800 mb-2 uppercase flex items-center gap-1"><Plus size={14}/> Adicionais / Turbinar Lanche:</span><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{adicionaisDisponiveis.map(ad => (<label key={ad.id} className={`flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer border-2 transition-all font-bold ${item.listaAdicionais?.includes(ad.id) ? 'bg-yellow-200 border-yellow-500 text-yellow-900 shadow-sm' : 'bg-white border-yellow-100 hover:border-yellow-300 text-gray-700'}`}><input type="checkbox" className="text-red-600 rounded-md w-5 h-5 border-2 border-red-300 focus:ring-red-500" checked={item.listaAdicionais?.includes(ad.id) || false} onChange={() => toggleAdicional(index, ad.id)}/><span className="flex-1">{ad.nome}</span><span className="font-black text-green-700 bg-green-100 px-2 py-0.5 rounded">{ad.preco > 0 ? `+R$${ad.preco.toFixed(2)}` : 'Grátis'}</span></label>))}</div></div>)}
                        </div>
                      );
                    })}
                    </div>
                    <button type="button" onClick={addLinhaItem} className="w-full py-3 bg-red-100 text-red-700 font-black uppercase tracking-wide flex items-center justify-center gap-2 mt-4 rounded-xl border-2 border-red-200 hover:bg-red-200 hover:border-red-300 transition-all border-dashed"><Plus size={20} /> Adicionar Outro Item ao Pedido</button>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-200 mt-6 shadow-sm flex flex-col sm:flex-row items-center gap-4"><label className="block text-base font-black text-orange-800 uppercase flex items-center gap-2 shrink-0"><Bike size={22} className="text-red-500"/> Taxa de Entrega</label><div className="flex-1 flex gap-3 w-full"><select className="flex-1 border-2 border-orange-200 rounded-xl p-3 bg-white font-bold text-gray-800 outline-none focus:border-orange-500" onChange={(e) => setFormPedido({...formPedido, taxaEntrega: e.target.value})} value={taxasFrete.some(t => t.valor == formPedido.taxaEntrega) ? formPedido.taxaEntrega : ''}><option value="0">🏠 Retirada no Balcão (Grátis)</option>{taxasFrete.map(t => <option key={t.id} value={t.valor}>🛵 {t.nome} - R$ {t.valor.toFixed(2)}</option>)}<option value="">Outro / Personalizado 👉</option></select><div className="w-36 relative shrink-0"><span className="absolute left-3 top-3 text-orange-500 font-bold">R$</span><input type="number" step="0.50" className="w-full border-2 border-orange-300 bg-white rounded-xl p-3 pl-10 font-black text-lg text-orange-800 outline-none focus:border-orange-500" value={formPedido.taxaEntrega} onChange={(e) => setFormPedido({...formPedido, taxaEntrega: e.target.value})} /></div></div></div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-6">
                    <div className="flex-1 bg-gray-50 p-4 rounded-xl border-2 border-gray-200"><label className="block text-sm font-black text-gray-700 mb-2 flex items-center gap-2 uppercase"><CreditCard size={20} className="text-blue-500"/> Forma de Pagamento</label><select className="w-full border-2 border-gray-300 rounded-xl p-3 bg-white font-bold text-lg outline-none focus:border-blue-500" value={formPedido.pagamento} onChange={(e) => setFormPedido({...formPedido, pagamento: e.target.value})}><option value="Dinheiro">💵 Dinheiro</option><option value="PIX">💠 PIX</option><option value="Cartão de Crédito">💳 Cartão de Crédito</option><option value="Cartão de Débito">💳 Cartão de Débito</option></select></div>
                    <div className="w-full sm:w-48 bg-red-50 p-4 rounded-xl border-2 border-red-200"><label className="block text-sm font-black text-red-700 mb-2 flex items-center gap-2 uppercase"><Percent size={20} className="text-red-500"/> Desconto (%)</label><input type="number" className="w-full border-2 border-red-300 rounded-xl p-3 text-red-600 font-black text-2xl text-center bg-white outline-none focus:border-red-500" value={formPedido.desconto} onChange={(e) => setFormPedido({...formPedido, desconto: e.target.value})} placeholder="0" /></div>
                  </div>
                  <div className="mt-6"><label className="block text-sm font-black text-gray-700 mb-2 flex items-center gap-2 uppercase"><FileText size={20} className="text-yellow-500"/> Observações Gerais</label><textarea className="w-full border-2 border-gray-300 rounded-xl p-3 h-24 bg-white font-medium focus:border-yellow-500 outline-none resize-none placeholder-gray-400" value={formPedido.observacoes} onChange={(e) => setFormPedido({...formPedido, observacoes: e.target.value})} placeholder="Ex: Capricha no molho! Tocar a campainha..." /></div>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t-4 border-double border-red-800/20 pt-6 bg-red-100/50 p-6 rounded-2xl -mx-2 -mb-2">
                   <div className="flex flex-col mb-4 sm:mb-0">
                     <span className="text-sm font-black text-red-800 uppercase tracking-wider">Total Final a Pagar:</span>
                     <div className="text-4xl font-black text-red-700 drop-shadow-sm mt-1 bg-white px-4 py-1 rounded-xl border-2 border-red-200 inline-block">R$ {calcularTotalGeral(formPedido.itens, formPedido.taxaEntrega, formPedido.desconto).toFixed(2)}</div>
                     {formPedido.desconto > 0 && <span className="text-xs text-green-600 font-black mt-2 bg-green-100 px-2 py-1 rounded-full inline-block border border-green-200">🎉 Desconto de {formPedido.desconto}% aplicado!</span>}
                   </div>
                   <button type="submit" className={`px-8 py-4 rounded-xl font-black shadow-lg transition-all text-white text-lg uppercase tracking-wide border-b-4 active:border-b-0 active:translate-y-[4px] flex items-center gap-3 ${formPedido.id ? 'bg-blue-600 hover:bg-blue-500 border-blue-800' : 'bg-green-500 hover:bg-green-400 border-green-700 animate-pulse hover:animate-none'}`}>{formPedido.id ? <><CheckCircle size={24}/> Salvar Alterações</> : <><CheckCircle size={24}/> LANÇAR PEDIDO NA CHAPA</>}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;