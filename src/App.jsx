import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, MapPin, User, CheckCircle, Utensils, 
  Plus, Trash2, Package, ClipboardList, Pencil, Settings, Bike, 
  MessageCircle, Map, DollarSign, History, Users, Calendar, 
  CreditCard, Box, Ban, RotateCcw, FileText, List, Clock, 
  GripVertical, Link, Percent, X, MessageSquare,
  Download, Upload, Database, TrendingUp
} from 'lucide-react';

// --- ESTILOS DE IMPRESSÃO (CORRIGIDO) ---
// Agora oculta o cupom na tela normal e só mostra na hora de imprimir
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
  const [estilo, setEstilo] = useState('text-gray-500 bg-gray-100');

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
        setEstilo('text-white bg-red-600 animate-pulse font-bold');
        return;
      }
      const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);
      setTempoRestante(`${minutos}m ${segundos}s`);

      if (minutos < 5) setEstilo('text-red-600 bg-red-50 font-bold');
      else if (minutos < 15) setEstilo('text-orange-600 bg-orange-50');
      else setEstilo('text-green-600 bg-green-50');
    };
    const intervalo = setInterval(calcular, 1000);
    calcular(); 
    return () => clearInterval(intervalo);
  }, [timestampInicial, minutosPrevistos]);

  return (<div className={`px-2 py-1 rounded flex items-center gap-1 text-xs border border-current ${estilo}`}><Clock size={12} /><span>{tempoRestante}</span></div>);
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
    // Aguarda renderizar e imprime
    setTimeout(() => {
      window.print();
      // LIMPEZA: Remove o pedido da tela de impressão após fechar a janela
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
    <div className="min-h-screen bg-amber-50 font-sans pb-20">
      <style>{printStyles}</style>
      
      {/* ÁREA DE IMPRESSÃO - SÓ APARECE NA IMPRESSORA */}
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
        <header className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border-b-4 border-red-500 mb-6">
          <div><h1 className="text-2xl md:text-3xl font-extrabold text-red-600 flex items-center gap-2"><Utensils className="text-yellow-500" /> BEST DOG</h1></div>
          <div className="flex bg-gray-100 p-1 rounded-lg mt-4 md:mt-0 overflow-x-auto items-center">
            <button onClick={() => setAbaAtiva('pedidos')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition whitespace-nowrap ${abaAtiva === 'pedidos' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ClipboardList size={18} /> Pedidos</button>
            <button onClick={() => setAbaAtiva('vendas')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition whitespace-nowrap ${abaAtiva === 'vendas' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><DollarSign size={18} /> Caixa</button>
            <button onClick={() => setAbaAtiva('clientes')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition whitespace-nowrap ${abaAtiva === 'clientes' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Users size={18} /> Clientes</button>
            <button onClick={() => setAbaAtiva('produtos')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition whitespace-nowrap ${abaAtiva === 'produtos' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Package size={18} /> Produtos</button>
            <button onClick={() => setAbaAtiva('config')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition whitespace-nowrap ${abaAtiva === 'config' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Settings size={18} /> Config</button>
            <button onClick={resetarSistema} className="ml-2 text-red-400 hover:text-red-600 p-2" title="Resetar Sistema"><Trash2 size={14}/></button>
          </div>
        </header>

        {abaAtiva === 'pedidos' && (
          <>
            <div className="flex justify-end mb-6"><button onClick={abrirNovo} className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full font-bold shadow-lg transition flex items-center gap-2"><Plus size={20} /> Novo Pedido</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pedidosPendentes.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">Nenhum pedido pendente.</div>}
              {pedidosPendentes.map((pedido) => (
                <div key={pedido.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                  <div className="bg-gray-900 p-4 text-white flex justify-between items-center group-hover:bg-red-600 transition-colors">
                    <span className="font-bold text-xl">#{pedido.id}</span>
                    <div className="flex gap-2"><button onClick={() => abrirEdicao(pedido)} className="bg-white/20 hover:bg-white/40 p-1 rounded text-white transition"><Pencil size={16} /></button><button onClick={() => {if(confirm("Excluir?")) setPedidos(pedidos.filter(p => p.id !== pedido.id))}} className="bg-white/20 hover:bg-red-800 p-1 rounded text-white transition"><Trash2 size={16} /></button></div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4 text-sm border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 text-gray-800 font-bold text-lg mb-1"><User size={18} className="text-red-500" /> {pedido.cliente.nome}</div>
                      <div className="flex items-start justify-between gap-2 text-gray-500 mt-2"><div className="flex items-start gap-2"><MapPin size={16} className="mt-1 shrink-0" /> <span className="leading-tight">{pedido.cliente.endereco}</span></div><button onClick={() => abrirNoMaps(pedido.cliente.endereco)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1 rounded"><Map size={18} /></button></div>
                    </div>
                    {pedido.observacoes && (<div className="mb-4 bg-yellow-50 border border-yellow-200 p-2 rounded text-sm text-yellow-800 flex items-start gap-2"><FileText size={16} className="mt-1 shrink-0"/> <span className="font-bold">{pedido.observacoes}</span></div>)}
                    <div className="mb-4 flex items-center justify-between gap-2 bg-gray-100 p-2 rounded border border-gray-200">
                        <div className="text-xs text-gray-600 flex flex-col"><span>Cozinha: <b>{pedido.tempoPreparo}m</b></span><span>Entrega: <b>{pedido.tempoDeslocamento}m</b></span></div>
                        <PedidoTimer timestampInicial={pedido.timestamp} minutosPrevistos={(Number(pedido.tempoPreparo) + Number(pedido.tempoDeslocamento))} />
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-5">
                      {pedido.itens.map((item, i) => {
                        const produtoPrincipal = produtos.find(p => p.id == item.produtoId);
                        if (!produtoPrincipal) return null;
                        const listaAdics = item.listaAdicionais || [];
                        const adics = listaAdics.map(id => produtos.find(p => p.id === id)).filter(Boolean);
                        const valorOpcao = extrairValorOpcao(item.opcaoSelecionada);
                        const nomeOpcao = extrairNomeOpcao(item.opcaoSelecionada);
                        return (
                          <div key={i} className="flex flex-col justify-between text-sm text-gray-800 py-1 border-b border-amber-200/50 last:border-0">
                            <div className="flex justify-between"><span><span className="text-red-600 font-bold">{item.qtd}x</span> {item.nome}</span><span className="text-gray-500 text-xs">({Number(item.preco).toFixed(2)})</span></div>
                            {nomeOpcao && (<div className="text-xs text-gray-500 pl-4 flex justify-between"><span>Opção: <strong>{nomeOpcao}</strong></span>{valorOpcao > 0 && <span className="text-green-700 font-bold">+R$ {valorOpcao.toFixed(2)}</span>}</div>)}
                            {adics.length > 0 && adics.map(ad => (<div key={ad.id} className="text-xs text-green-700 pl-4 font-bold flex justify-between"><span>+ {ad.nome}</span><span>+R$ {ad.preco.toFixed(2)}</span></div>))}
                          </div>
                        )
                      })}
                      {pedido.taxaEntrega > 0 && (<div className="flex justify-between text-sm text-gray-600 py-1 border-b border-amber-200/50 pt-2"><span className="flex items-center gap-1"><Bike size={14}/> Entrega</span><span>R$ {Number(pedido.taxaEntrega).toFixed(2)}</span></div>)}
                      {pedido.desconto > 0 && (<div className="flex justify-between text-sm text-red-600 py-1 border-b border-amber-200/50 font-bold"><span className="flex items-center gap-1"><Percent size={14}/> Desconto ({pedido.desconto}%)</span><span>- R$ {(calcularTotalGeral(pedido.itens, 0, 0) * (pedido.desconto/100)).toFixed(2)}</span></div>)}
                      <div className="flex justify-between text-sm text-gray-600 py-1 border-b border-amber-200/50"><span className="flex items-center gap-1 font-bold"><CreditCard size={14}/> {pedido.pagamento}</span></div>
                      <div className="mt-3 pt-2 border-t border-amber-200 flex justify-between items-center"><span className="text-xs text-gray-500 uppercase font-bold">Total</span><span className="font-bold text-xl text-gray-900">R$ {pedido.total.toFixed(2)}</span></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3"><button onClick={() => imprimirComanda(pedido)} className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 py-2 px-2 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition font-bold text-xs"><Printer size={16} /> IMPR.</button><button onClick={() => enviarParaMotoboy(pedido)} className="flex items-center justify-center gap-2 bg-green-100 text-green-700 border-2 border-green-200 py-2 px-2 rounded-lg hover:bg-green-100 transition font-bold text-xs"><Bike size={16} /> MOTO</button><button onClick={() => enviarParaCliente(pedido)} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border-2 border-blue-200 py-2 px-2 rounded-lg hover:bg-blue-100 transition font-bold text-xs"><MessageSquare size={16} /> ZAP</button></div>
                    <div className="flex gap-2"><button onClick={() => cancelarPedido(pedido.id)} className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-700 py-3 px-2 rounded-lg hover:bg-red-200 transition font-bold text-sm"><Ban size={18} /> Cancelar</button><button onClick={() => concluirPedido(pedido.id)} className="flex-[2] flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 shadow-md transition font-bold text-base transform active:scale-95"><CheckCircle size={20} /> CONCLUIR</button></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {abaAtiva === 'vendas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow border border-gray-200">
              <div className="flex items-center gap-2 text-gray-700"><Calendar size={24} className="text-green-600"/><span className="font-bold">Movimento do Dia:</span></div>
              <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="border border-gray-300 rounded-lg p-2 font-bold text-gray-700"/>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-700 rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center">
              <div><h2 className="text-green-100 font-medium mb-1">Faturamento (Vendas Reais)</h2><div className="text-4xl font-bold">R$ {totalVendasDia.toFixed(2)}</div><p className="text-green-100 mt-2">{pedidosHistorico.filter(p => p.status === 'Concluido').length} vendas realizadas</p></div>
              <div className="bg-white/20 p-4 rounded-full mt-4 md:mt-0"><DollarSign size={40} /></div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-6">
              <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2 mb-4"><TrendingUp size={20} className="text-orange-500"/> Top 5 Mais Vendidos (Geral)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {getProdutosMaisVendidos().length > 0 ? getProdutosMaisVendidos().map((prod, idx) => (<div key={idx} className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex flex-col items-center justify-center text-center"><div className="text-2xl font-black text-orange-600">{idx + 1}º</div><div className="font-bold text-gray-800 text-sm">{prod.nome}</div><div className="text-xs text-gray-500">{prod.qtd} unidades</div></div>)) : (<div className="col-span-5 text-center text-gray-400 py-2">Nenhuma venda concluída ainda para gerar ranking.</div>)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center"><h2 className="text-lg font-bold text-gray-700 flex items-center gap-2"><History size={20}/> Detalhamento do Dia</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left"><thead className="bg-gray-100 text-gray-600 text-sm uppercase"><tr><th className="p-4">ID</th><th className="p-4">Hora</th><th className="p-4">Cliente</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4 text-right">Ação</th></tr></thead><tbody className="divide-y divide-gray-100">{pedidosHistorico.slice().reverse().map((pedido) => (<tr key={pedido.id} className={`hover:bg-gray-50 ${pedido.status === 'Cancelado' ? 'opacity-50 bg-gray-50' : ''}`}><td className="p-4 font-bold text-gray-600">#{pedido.id}</td><td className="p-4 text-gray-500 text-sm">{pedido.hora}</td><td className="p-4 font-medium">{pedido.cliente.nome}</td><td className={`p-4 font-bold ${pedido.status === 'Cancelado' ? 'text-gray-400 line-through' : 'text-green-600'}`}>R$ {pedido.total.toFixed(2)}</td><td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${pedido.status === 'Concluido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{pedido.status}</span></td><td className="p-4 text-right">{pedido.status === 'Concluido' && (<button onClick={() => registrarDevolucao(pedido.id)} className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 px-2 py-1 rounded hover:bg-red-50 flex items-center gap-1 ml-auto"><RotateCcw size={12}/> Devolução</button>)}</td></tr>))}</tbody></table>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'clientes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-fit"><h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={20} className="text-blue-600"/> Novo Cliente</h2><form onSubmit={salvarCliente} className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={novoCliente.nome} onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})} /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label><input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={novoCliente.telefone} onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})} /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Endereço Completo</label><input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={novoCliente.endereco} onChange={(e) => setNovoCliente({...novoCliente, endereco: e.target.value})} /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Frete Fixo</label><input type="number" step="0.50" className="w-full border border-gray-300 rounded-lg p-2" value={novoCliente.taxaFixa} onChange={(e) => setNovoCliente({...novoCliente, taxaFixa: e.target.value})} /></div><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition">Salvar</button></form></div>
              <div className="md:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"><div className="bg-gray-50 p-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Users size={20}/> Clientes</h2></div><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100 text-gray-600 text-sm uppercase"><tr><th className="p-4">Nome</th><th className="p-4">Endereço</th><th className="p-4">Frete</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-100">{clientes.map((cli) => (<tr key={cli.id} className="hover:bg-gray-50 transition"><td className="p-4"><div className="font-bold text-gray-800">{cli.nome}</div><div className="text-xs text-gray-500">{cli.telefone}</div></td><td className="p-4 text-sm text-gray-600">{cli.endereco}</td><td className="p-4 font-bold text-green-600">{cli.taxaFixa ? `R$ ${Number(cli.taxaFixa).toFixed(2)}` : '-'}</td><td className="p-4 text-right"><button onClick={() => deletarCliente(cli.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div></div>
          </div>
        )}

        {abaAtiva === 'produtos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-fit">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={20} className="text-red-600"/> Novo Item</h2>
                <form onSubmit={salvarProduto} className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => setNovoProduto({...novoProduto, tipo: 'principal'})} className={`flex-1 py-2 rounded text-sm font-bold border ${novoProduto.tipo === 'principal' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300'}`}>Item do Cardápio</button>
                    <button type="button" onClick={() => setNovoProduto({...novoProduto, tipo: 'adicional'})} className={`flex-1 py-2 rounded text-sm font-bold border ${novoProduto.tipo === 'adicional' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-600 border-gray-300'}`}>Adicional / Extra</button>
                  </div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={novoProduto.nome} onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label><input required type="number" step="0.50" className="w-full border border-gray-300 rounded-lg p-2" value={novoProduto.preco} onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})} /></div>
                  {novoProduto.tipo === 'principal' && (
                    <>
                     <div><label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label><select className="w-full border border-gray-300 rounded-lg p-2 bg-white" value={novoProduto.categoria} onChange={(e) => setNovoProduto({...novoProduto, categoria: e.target.value})}><option value="Lanches">Lanches</option><option value="Bebidas">Bebidas</option><option value="Combos">Combos</option><option value="Sobremesas">Sobremesas</option><option value="Outros">Outros</option></select></div>
                     <div><label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><List size={16}/> Opções (Ex: Molho=+2.00)</label><input type="text" className="w-full border border-gray-300 rounded-lg p-2" value={novoProduto.opcoes} onChange={(e) => setNovoProduto({...novoProduto, opcoes: e.target.value})} placeholder="Ex: Vinagrete, Cheddar=+2.00" /></div>
                     <div className="mt-4 border-t pt-4">
                       <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Link size={16}/> Quais adicionais este item aceita?</label>
                       <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                         {produtos.filter(p => p.tipo === 'adicional').map(ad => (<label key={ad.id} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-100 rounded cursor-pointer"><input type="checkbox" checked={novoProduto.idsAdicionaisPermitidos?.includes(ad.id) || false} onChange={() => toggleAdicionalNoCadastro(ad.id)} className="text-red-600 rounded"/><span>{ad.nome}</span></label>))}
                         {produtos.filter(p => p.tipo === 'adicional').length === 0 && <span className="text-xs text-gray-400">Nenhum adicional cadastrado.</span>}
                       </div>
                     </div>
                    </>
                  )}
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Estoque Inicial</label><input type="number" className="w-full border border-gray-300 rounded-lg p-2" value={novoProduto.estoque} onChange={(e) => setNovoProduto({...novoProduto, estoque: e.target.value})} placeholder="0"/></div>
                  <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-bold transition">Salvar Item</button>
                </form>
              </div>
              <div className="md:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-700 flex items-center gap-2"><ClipboardList size={20}/> Cadastro Geral</h2>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setTipoCadastro('lanches')} className={`px-3 py-1 rounded text-xs font-bold ${tipoCadastro === 'lanches' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>Lanches & Bebidas</button>
                    <button onClick={() => setTipoCadastro('adicionais')} className={`px-3 py-1 rounded text-xs font-bold ${tipoCadastro === 'adicionais' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>Adicionais</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 text-sm uppercase"><tr><th className="p-4 w-10"></th><th className="p-4">Tipo</th><th className="p-4">Item</th><th className="p-4">Preço</th><th className="p-4">Estoque</th><th className="p-4 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {tipoCadastro === 'lanches' ? ([...new Set(produtos.filter(p => p.tipo !== 'adicional').map(p => p.categoria || 'Geral'))].map(cat => (
                            <React.Fragment key={cat}>
                               <tr className="bg-gray-100"><td colSpan="6" className="p-2 pl-4 font-bold text-gray-600 text-xs uppercase">{cat}</td></tr>
                               {produtos.filter(p => p.tipo !== 'adicional' && (p.categoria || 'Geral') === cat).map((prod, index) => (
                                  <tr key={prod.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} className="hover:bg-gray-50 transition cursor-move">
                                    <td className="p-4 text-gray-400"><GripVertical size={16}/></td><td className="p-4"><span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">Principal</span></td><td className="p-4 font-medium text-gray-800"><input type="text" value={prod.nome} onChange={(e) => atualizarProduto(prod.id, 'nome', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-full outline-none transition"/></td><td className="p-4"><input type="number" step="0.50" value={prod.preco} onChange={(e) => atualizarProduto(prod.id, 'preco', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-20 font-bold text-green-600 outline-none transition"/></td><td className="p-4"><div className="flex items-center gap-2"><Box size={16} className="text-gray-400"/><input type="number" value={prod.estoque || ''} onChange={(e) => atualizarProduto(prod.id, 'estoque', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-16 outline-none transition"/></div></td><td className="p-4 text-right"><button onClick={() => deletarProduto(prod.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"><Trash2 size={18} /></button></td>
                                  </tr>
                               ))}
                            </React.Fragment>
                         ))) : (
                         <>
                         <tr className="bg-gray-100"><td colSpan="6" className="p-2 pl-4 font-bold text-gray-600 text-xs uppercase">Adicionais / Complementos</td></tr>
                         {produtos.filter(p => p.tipo === 'adicional').map((prod, index) => (
                           <tr key={prod.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} className="hover:bg-gray-50 transition cursor-move">
                             <td className="p-4 text-gray-400"><GripVertical size={16}/></td><td className="p-4"><span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">Adicional</span></td><td className="p-4 font-medium text-gray-800"><input type="text" value={prod.nome} onChange={(e) => atualizarProduto(prod.id, 'nome', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-full outline-none transition"/></td><td className="p-4"><input type="number" step="0.50" value={prod.preco} onChange={(e) => atualizarProduto(prod.id, 'preco', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-20 font-bold text-green-600 outline-none transition"/></td><td className="p-4"><div className="flex items-center gap-2"><Box size={16} className="text-gray-400"/><input type="number" value={prod.estoque || ''} onChange={(e) => atualizarProduto(prod.id, 'estoque', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-16 outline-none transition"/></div></td><td className="p-4 text-right"><button onClick={() => deletarProduto(prod.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"><Trash2 size={18} /></button></td>
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

        {abaAtiva === 'config' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-fit"><h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Bike size={20} className="text-red-600"/> Nova Taxa</h2><form onSubmit={salvarTaxa} className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={novaTaxa.nome} onChange={(e) => setNovaTaxa({...novaTaxa, nome: e.target.value})} /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">Valor</label><input required type="number" step="0.50" className="w-full border border-gray-300 rounded-lg p-2" value={novaTaxa.valor} onChange={(e) => setNovaTaxa({...novaTaxa, valor: e.target.value})} /></div><button type="submit" className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-bold transition">Salvar</button></form></div>
              <div className="md:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"><div className="bg-gray-50 p-4 border-b border-gray-200"><h2 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Settings size={20}/> Configurações Gerais</h2></div>
                <div className="p-4 bg-blue-50 flex gap-4 mb-4 border-b border-blue-100">
                   <div className="flex-1"><label className="block text-xs font-bold text-blue-800 mb-1">Tempo Preparo Padrão (min)</label><input type="number" className="w-full border border-blue-300 rounded p-2" value={configTempos.preparo} onChange={(e) => setConfigTempos({...configTempos, preparo: e.target.value})} /></div>
                   <div className="flex-1"><label className="block text-xs font-bold text-blue-800 mb-1">Tempo Trajeto Padrão (min)</label><input type="number" className="w-full border border-blue-300 rounded p-2" value={configTempos.deslocamento} onChange={(e) => setConfigTempos({...configTempos, deslocamento: e.target.value})} /></div>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-100 text-gray-600 text-sm uppercase"><tr><th className="p-4">Descrição</th><th className="p-4">Valor</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-100">{taxasFrete.map((taxa) => (<tr key={taxa.id} className="hover:bg-gray-50 transition"><td className="p-4 font-medium text-gray-800"><input type="text" value={taxa.nome} onChange={(e) => atualizarTaxaNaLista(taxa.id, 'nome', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-full outline-none transition"/></td><td className="p-4 text-green-600 font-bold"><input type="number" step="0.50" value={taxa.valor} onChange={(e) => atualizarTaxaNaLista(taxa.id, 'valor', e.target.value)} className="bg-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 w-24 outline-none transition"/></td><td className="p-4 text-right"><button onClick={() => deletarTaxa(taxa.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div></div>
            </div>
            <div className="mt-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Database size={20} className="text-blue-600"/> Segurança de Dados</h2>
              <p className="text-sm text-gray-500 mb-4">Seus dados ficam salvos apenas neste navegador. Faça backups frequentes para não perder clientes e histórico.</p>
              <div className="flex flex-col md:flex-row gap-4">
                <button onClick={exportarBackup} className="flex-1 flex items-center justify-center gap-2 bg-blue-100 text-blue-700 py-3 rounded-lg font-bold hover:bg-blue-200 transition"><Download size={18}/> Baixar Backup (Salvar)</button>
                <div className="flex-1 relative"><input type="file" accept=".json" onChange={importarBackup} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/><button className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition pointer-events-none"><Upload size={18}/> Restaurar Backup (Carregar)</button></div>
              </div>
            </div>
          </>
        )}
        
        {modalAberto && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
              <div className={`p-4 flex justify-between items-center text-white ${formPedido.id ? 'bg-blue-600' : 'bg-red-600'}`}><h2 className="font-bold text-lg flex items-center gap-2">{formPedido.id ? <><Pencil size={20}/> Editar Pedido #{formPedido.id}</> : <><Plus size={20}/> Novo Pedido</>}</h2><button onClick={() => setModalAberto(false)} className="hover:bg-white/20 p-1 rounded"><X size={24} /></button></div>
              <form onSubmit={salvarPedido} className="p-6 max-h-[80vh] overflow-y-auto">
                {!formPedido.id && (<div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100"><label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Já é cliente?</label><select className="w-full border border-blue-300 rounded p-2 bg-white text-blue-900" onChange={(e) => selecionarCliente(e.target.value)} defaultValue=""><option value="">Selecione um cliente cadastrado...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.endereco}</option>)}</select></div>)}
                <div className="space-y-4">
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome do Cliente</label><input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formPedido.nome} onChange={(e) => setFormPedido({...formPedido, nome: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Endereço</label><input required type="text" className="w-full border border-gray-300 rounded-lg p-2" value={formPedido.endereco} onChange={(e) => setFormPedido({...formPedido, endereco: e.target.value})} /></div>
                  <div className="flex gap-2 bg-gray-50 p-2 rounded border border-gray-200">
                      <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">Tempo Cozinha (min)</label><input type="number" className="w-full border border-gray-300 rounded p-2 bg-white" value={formPedido.tempoPreparo} onChange={(e) => setFormPedido({...formPedido, tempoPreparo: e.target.value})} /></div>
                      <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">Tempo Trajeto (min)</label><input type="number" className="w-full border border-gray-300 rounded p-2 bg-white" value={formPedido.tempoDeslocamento} onChange={(e) => setFormPedido({...formPedido, tempoDeslocamento: e.target.value})} /></div>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Itens</label>
                    {formPedido.itens.map((item, index) => {
                      const produtoPrincipal = produtos.find(p => p.id == item.produtoId);
                      const idsPermitidos = produtoPrincipal?.idsAdicionaisPermitidos || [];
                      const adicionaisDisponiveis = produtos.filter(p => p.tipo === 'adicional' && idsPermitidos.includes(p.id));
                      return (
                        <div key={index} className="mb-4 pb-4 border-b border-gray-100 bg-gray-50 p-3 rounded-lg">
                          <div className="flex gap-2 items-end mb-2">
                            <div className="w-16"><label className="text-xs text-gray-500">Qtd</label><input type="number" min="1" className="w-full border border-gray-300 rounded p-2 text-center" value={item.qtd} onChange={(e) => atualizaItem(index, 'qtd', e.target.value)} /></div>
                            <div className="flex-1"><label className="text-xs text-gray-500">Produto</label><select className="w-full border border-gray-300 rounded p-2 bg-white" value={item.produtoId} onChange={(e) => selecionaProd(index, e.target.value)} required><option value="">Selecione...</option>{produtos.filter(p => p.tipo === 'principal').map(p => <option key={p.id} value={p.id}>{p.nome} ({p.estoque || 0} un)</option>)}</select></div>
                            <div className="w-24"><label className="text-xs text-gray-500">Preço (R$)</label><input type="number" step="0.50" className="w-full border border-gray-300 bg-white rounded p-2" value={item.preco} onChange={(e) => atualizaItem(index, 'preco', e.target.value)} /></div>
                            {formPedido.itens.length > 1 && (<button type="button" onClick={() => removeLinhaItem(index)} className="bg-red-100 text-red-600 p-2 rounded mb-[1px] hover:bg-red-200"><Trash2 size={20} /></button>)}
                          </div>
                          {item.produtoId && produtos.find(p => p.id == item.produtoId)?.opcoes && (
                            <div className="mt-2 pl-2 border-l-2 border-orange-200 mb-2">
                               <label className="block text-xs font-bold text-gray-600 mb-1">Opção do Lanche:</label>
                               <select className="w-full border border-orange-200 bg-orange-50 rounded p-2 text-sm text-orange-900" value={item.opcaoSelecionada} onChange={(e) => atualizaItem(index, 'opcaoSelecionada', e.target.value)}>{produtos.find(p => p.id == item.produtoId).opcoes.split(',').map((op, i) => { const nome = extrairNomeOpcao(op); const val = extrairValorOpcao(op); return <option key={i} value={op.trim()}>{nome} {val > 0 ? `(+ R$ ${val.toFixed(2)})` : ''}</option>; })}</select>
                            </div>
                          )}
                          {item.produtoId && adicionaisDisponiveis.length > 0 && (
                            <div className="mt-2 pl-2 border-l-2 border-yellow-300">
                               <span className="block text-xs font-bold text-gray-600 mb-1">Adicionais Disponíveis:</span>
                               <div className="grid grid-cols-2 gap-2">{adicionaisDisponiveis.map(ad => (<label key={ad.id} className={`flex items-center gap-2 text-sm p-1 rounded cursor-pointer border ${item.listaAdicionais?.includes(ad.id) ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-100'}`}><input type="checkbox" className="text-red-600 rounded" checked={item.listaAdicionais?.includes(ad.id) || false} onChange={() => toggleAdicional(index, ad.id)}/><span className="flex-1">{ad.nome}</span><span className="font-bold text-green-700">{ad.preco > 0 ? `+R$${ad.preco.toFixed(2)}` : 'Grátis'}</span></label>))}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button type="button" onClick={addLinhaItem} className="text-sm text-red-600 font-bold flex items-center gap-1 mt-2 hover:underline"><Plus size={16} /> Adicionar item</button>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-4"><label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Bike size={18}/> Taxa de Entrega / Frete</label><div className="flex gap-2"><select className="flex-1 border border-gray-300 rounded p-2 bg-white" onChange={(e) => setFormPedido({...formPedido, taxaEntrega: e.target.value})} value={taxasFrete.some(t => t.valor == formPedido.taxaEntrega) ? formPedido.taxaEntrega : ''}><option value="0">Sem Frete / Balcão</option>{taxasFrete.map(t => <option key={t.id} value={t.valor}>{t.nome} - R$ {t.valor.toFixed(2)}</option>)}<option value="">Outro / Personalizado 👉</option></select><div className="w-28 relative"><span className="absolute left-2 top-2 text-gray-500 text-sm">R$</span><input type="number" step="0.50" className="w-full border border-gray-300 rounded p-2 pl-8 font-bold text-gray-800" value={formPedido.taxaEntrega} onChange={(e) => setFormPedido({...formPedido, taxaEntrega: e.target.value})} /></div></div></div>
                  <div className="mt-4 flex gap-4">
                    <div className="flex-1"><label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><CreditCard size={18}/> Forma de Pagamento</label><select className="w-full border border-gray-300 rounded-lg p-2 bg-white" value={formPedido.pagamento} onChange={(e) => setFormPedido({...formPedido, pagamento: e.target.value})}><option value="Dinheiro">Dinheiro</option><option value="PIX">PIX</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Cartão de Débito">Cartão de Débito</option></select></div>
                    <div className="w-32"><label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><Percent size={18}/> Desconto (%)</label><input type="number" className="w-full border border-gray-300 rounded-lg p-2 text-red-600 font-bold" value={formPedido.desconto} onChange={(e) => setFormPedido({...formPedido, desconto: e.target.value})} placeholder="0" /></div>
                  </div>
                  <div className="mt-4"><label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><FileText size={18}/> Observações do Pedido</label><textarea className="w-full border border-gray-300 rounded-lg p-2 h-20" value={formPedido.observacoes} onChange={(e) => setFormPedido({...formPedido, observacoes: e.target.value})} placeholder="Ex: Vinagrete de Repolho, Sem Cebola..." /></div>
                </div>
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                   <div className="flex flex-col"><span className="text-xs text-gray-500">Total Final:</span><div className="text-2xl font-bold text-gray-800">R$ {calcularTotalGeral(formPedido.itens, formPedido.taxaEntrega, formPedido.desconto).toFixed(2)}</div>{formPedido.desconto > 0 && <span className="text-xs text-red-500 font-bold">Desconto aplicado: {formPedido.desconto}%</span>}</div>
                   <button type="submit" className={`px-6 py-3 rounded-lg font-bold shadow-md transition text-white ${formPedido.id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>{formPedido.id ? 'Salvar' : 'Lançar Pedido'}</button>
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