const ReloadAPI = (() => {
  const DEFAULT_TIMEOUT = 30000;

  function buildUrl(action, params = {}) {
    const url = new URL(CONFIG.API_URL);

    url.searchParams.set('action', action);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  async function requestGet(action, params = {}) {
    const url = buildUrl(action, params);

    return request(url, {
      method: 'GET'
    });
  }

  async function requestPost(action, payload = {}) {
    const url = buildUrl(action);

    return request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'follow',
        signal: controller.signal
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
      }

      let json;

      try {
        json = JSON.parse(text);
      } catch (error) {
        throw new Error('A API não retornou JSON válido. Verifique se o servidor local está rodando (npm start).');
      }

      if (!json.success) {
        throw new Error(json.error || 'Erro inesperado na API.');
      }

      return json;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Tempo limite excedido ao conectar com o servidor local.');
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function ping() {
    const response = await requestGet('ping');
    return response.data;
  }

  async function health() {
    const response = await requestGet('health');
    return response.data;
  }

  async function obterConfig() {
    const response = await requestGet('config');
    return response.data;
  }

  async function registrarLog(log) {
    const response = await requestPost('registrarLog', {
      ...log,
      empresaId: CONFIG.EMPRESA_ID,
      empresaNome: CONFIG.EMPRESA_NOME,
      versaoSistema: CONFIG.SYSTEM_VERSION
    });

    return response.data;
  }

  async function listarLogs() {
    const response = await requestGet('listarLogs');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function loginOperador(pin) {
    const response = await requestPost('loginOperador', { pin });
    return response.data;
  }

  async function listarOperadores() {
    const response = await requestGet('listarOperadores');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function listarProdutos() {
    const response = await requestGet('listarProdutos');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function adicionarProduto(produto) {
    const response = await requestPost('adicionarProduto', produto);
    return response.data;
  }

  async function editarProduto(produto) {
    const response = await requestPost('editarProduto', produto);
    return response.data;
  }

  async function arquivarProduto(id, operadorId = '') {
    const response = await requestPost('arquivarProduto', {
      id,
      operadorId
    });

    return response.data;
  }

  async function listarClientes() {
    const response = await requestGet('listarClientes');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function adicionarCliente(cliente) {
    const response = await requestPost('adicionarCliente', cliente);
    return response.data;
  }

  async function editarCliente(cliente) {
    const response = await requestPost('editarCliente', cliente);
    return response.data;
  }

  async function arquivarCliente(id, operadorId = '') {
    const response = await requestPost('arquivarCliente', {
      id,
      operadorId
    });

    return response.data;
  }

  async function listarFornecedores() {
    const response = await requestGet('listarFornecedores');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function adicionarFornecedor(fornecedor) {
    const response = await requestPost('adicionarFornecedor', fornecedor);
    return response.data;
  }

  async function editarFornecedor(fornecedor) {
    const response = await requestPost('editarFornecedor', fornecedor);
    return response.data;
  }

  async function arquivarFornecedor(id) {
    const response = await requestPost('arquivarFornecedor', { id });
    return response.data;
  }

  async function registrarEntradaEstoque(payload) {
    const response = await requestPost('registrarEntradaEstoque', payload);
    return response.data;
  }

  async function listarEntradasEstoque() {
    const response = await requestGet('listarEntradasEstoque');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function criarPedido(payload = {}) {
    const response = await requestPost('criarPedido', payload);
    return response.data;
  }

  async function listarPedidosAbertos() {
    const response = await requestGet('listarPedidosAbertos');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function obterPedido(id) {
    const response = await requestGet('obterPedido', { id });
    return response.data;
  }

  async function adicionarItemPedido(payload) {
    const response = await requestPost('adicionarItemPedido', payload);
    return response.data;
  }

  async function aplicarDescontoItem(itemId, desconto) {
    const response = await requestPost('aplicarDescontoItem', { itemId, desconto });
    return response.data;
  }

  async function removerItemPedido(itemId, operadorId) {
    const response = await requestPost('removerItemPedido', {
      itemId,
      operadorId
    });

    return response.data;
  }

  async function cancelarPedido(pedidoId, adminPin, observacao = '') {
    const response = await requestPost('cancelarPedido', {
      pedidoId,
      adminPin,
      observacao
    });

    return response.data;
  }

  async function finalizarPedido(payload) {
    const response = await requestPost('finalizarPedido', payload);
    return response.data;
  }

  async function abrirCaixa(payload) {
    const response = await requestPost('abrirCaixa', payload);
    return response.data;
  }

  async function obterCaixaDia(data = '') {
    const response = await requestGet('obterCaixaDia', { data });
    return response.data;
  }

  async function fecharCaixa(payload) {
    const response = await requestPost('fecharCaixa', payload);
    return response.data;
  }

  async function registrarMovimentoCaixa(payload) {
    const response = await requestPost('registrarMovimentoCaixa', payload);
    return response.data;
  }

  async function listarMovimentosCaixa(data = '') {
    const response = await requestGet('listarMovimentosCaixa', { data });
    return Array.isArray(response.data) ? response.data : [];
  }

  async function buscarVendaParaDevolucao(pedidoId) {
    const response = await requestGet('buscarVendaParaDevolucao', { pedidoId });
    return response.data;
  }

  async function registrarDevolucao(payload) {
    const response = await requestPost('registrarDevolucao', payload);
    return response.data;
  }

  async function listarDevolucoes(data = '') {
    const response = await requestGet('listarDevolucoes', { data });
    return Array.isArray(response.data) ? response.data : [];
  }

  async function listarVendas(params = {}) {
    const response = await requestGet('listarVendas', params);
    return Array.isArray(response.data) ? response.data : [];
  }

  async function relatorioDiario(data) {
    const response = await requestGet('relatorioDiario', { data });
    return response.data;
  }

  async function relatorioMensal(ano, mes) {
    const response = await requestGet('relatorioMensal', { ano, mes });
    return response.data;
  }

  async function relatorioAnual(ano) {
    const response = await requestGet('relatorioAnual', { ano });
    return response.data;
  }

  async function gerarPdfMensal(payload) {
    const response = await requestPost('gerarPdfMensal', payload);
    return response.data;
  }

  async function gerarPdfFechamentoDiario(payload) {
    const response = await requestPost('gerarPdfFechamentoDiario', payload);
    return response.data;
  }

  async function listarRelatoriosPDF() {
    const response = await requestGet('listarRelatoriosPDF');
    return Array.isArray(response.data) ? response.data : [];
  }

  async function backupManual(payload) {
    const response = await requestPost('backupManual', payload);
    return response.data;
  }

  async function listarBackups() {
    const response = await requestGet('listarBackups');
    return Array.isArray(response.data) ? response.data : [];
  }

  return {
    ping,
    health,
    obterConfig,
    registrarLog,
    listarLogs,

    loginOperador,
    listarOperadores,

    listarProdutos,
    adicionarProduto,
    editarProduto,
    arquivarProduto,

    listarClientes,
    adicionarCliente,
    editarCliente,
    arquivarCliente,

    criarPedido,
    listarPedidosAbertos,
    obterPedido,
    adicionarItemPedido,
    aplicarDescontoItem,
    removerItemPedido,
    cancelarPedido,
    finalizarPedido,

    abrirCaixa,
    obterCaixaDia,
    fecharCaixa,
    registrarMovimentoCaixa,
    listarMovimentosCaixa,

    listarVendas,
    relatorioDiario,
    relatorioMensal,
    relatorioAnual,

    gerarPdfMensal,
    gerarPdfFechamentoDiario,
    listarRelatoriosPDF,

    backupManual,
    listarBackups,

    buscarVendaParaDevolucao,
    registrarDevolucao,
    listarDevolucoes,

    listarFornecedores,
    adicionarFornecedor,
    editarFornecedor,
    arquivarFornecedor,

    registrarEntradaEstoque,
    listarEntradasEstoque
  };
})();