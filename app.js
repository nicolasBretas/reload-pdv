// Reload PDV - Cérebro do sistema
// Versão 1.1.0

const App = (() => {
  const state = {
    products: [],
    clients: [],
    openOrders: [],
    currentOrder: null,
    cashDay: null,
    currentOperator: null,
    activeView: 'pdv',
    activeCategory: 'todos',
    paymentChart: null,
    isSyncing: false,
    isSubmitting: false,
    autoSyncTimer: null,
    barcodeTimer: null,
    lastBarcode: '',
    lastBarcodeAt: 0,
    adminPinResolve: null,
    adminPinReject: null,
    adminActionContext: null,
    bulkSession: {
      items: [],
      lastCategory: ''
    },
    suppliers: [],
    stockEntryItems: []
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    setDefaultDates();
    bindEvents();
    installGlobalErrorHandlers();
    loadNetworkAddress();

    loadStoredOperator();
    renderOperator();

    if (!state.currentOperator && CONFIG.REQUIRE_LOGIN) {
      showLoginModal();
      setConnectionStatus('neutral', 'Aguardando login');
      return;
    }

    hideLoginModal();
    await bootAfterLogin();
  }

  async function bootAfterLogin() {
    await fullSync();
    await restoreCurrentOrder();

    if (CONFIG.AUTO_SYNC_ENABLED) {
      startAutoSync();
    }

    if (CONFIG.HEALTH_CHECK_ON_START) {
      runHealthCheck(false);
    }

    focusBarcodeInput();
  }

  function cacheElements() {
    els.btnSync = document.getElementById('btnSync');
    els.btnOpenCashHeader = document.getElementById('btnOpenCashHeader');
    els.btnLogout = document.getElementById('btnLogout');

    els.currentOperatorName = document.getElementById('currentOperatorName');
    els.currentOperatorRole = document.getElementById('currentOperatorRole');

    els.connectionStatus = document.getElementById('connectionStatus');
    els.cashStatus = document.getElementById('cashStatus');
    els.lastSync = document.getElementById('lastSync');
    els.networkAddress = document.getElementById('networkAddress');
    els.loginNetworkAddress = document.getElementById('loginNetworkAddress');
    els.feedbackMessage = document.getElementById('feedbackMessage');

    els.navButtons = document.querySelectorAll('[data-view-target]');
    els.views = document.querySelectorAll('.view');

    els.pdvProductSearch = document.getElementById('pdvProductSearch');
    els.barcodeInput = document.getElementById('barcodeInput');
    els.categoryFilter = document.getElementById('categoryFilter');
    els.pdvProductSections = document.getElementById('pdvProductSections');

    els.currentOrderId = document.getElementById('currentOrderId');
    els.orderClientSelect = document.getElementById('orderClientSelect');
    els.btnCreateOrder = document.getElementById('btnCreateOrder');
    els.currentOrderItems = document.getElementById('currentOrderItems');
    els.orderSubtotal = document.getElementById('orderSubtotal');
    els.orderDiscountInput = document.getElementById('orderDiscountInput');
    els.orderTotal = document.getElementById('orderTotal');
    els.paymentMethodSelect = document.getElementById('paymentMethodSelect');
    els.btnSaveOpenOrder = document.getElementById('btnSaveOpenOrder');
    els.btnFinishOrder = document.getElementById('btnFinishOrder');
    els.btnCancelOrder = document.getElementById('btnCancelOrder');

    els.checkoutModal = document.getElementById('checkoutModal');
    els.checkoutForm = document.getElementById('checkoutForm');
    els.checkoutClient = document.getElementById('checkoutClient');
    els.checkoutTotal = document.getElementById('checkoutTotal');
    els.checkoutMethods = document.getElementById('checkoutMethods');
    els.checkoutCashBox = document.getElementById('checkoutCashBox');
    els.checkoutReceivedInput = document.getElementById('checkoutReceivedInput');
    els.checkoutQuickValues = document.getElementById('checkoutQuickValues');
    els.checkoutChangeBox = document.getElementById('checkoutChangeBox');
    els.checkoutChangeLabel = document.getElementById('checkoutChangeLabel');
    els.checkoutChange = document.getElementById('checkoutChange');
    els.btnCloseCheckoutModal = document.getElementById('btnCloseCheckoutModal');
    els.btnCancelCheckout = document.getElementById('btnCancelCheckout');
    els.btnConfirmCheckout = document.getElementById('btnConfirmCheckout');
    els.checkoutFeedback = document.getElementById('checkoutFeedback');

    els.productsSearch = document.getElementById('productsSearch');
    els.productsTableBody = document.getElementById('productsTableBody');
    els.btnNewProduct = document.getElementById('btnNewProduct');

    els.productModal = document.getElementById('productModal');
    els.productModalTitle = document.getElementById('productModalTitle');
    els.productForm = document.getElementById('productForm');
    els.productId = document.getElementById('productId');
    els.productCategory = document.getElementById('productCategory');
    els.productName = document.getElementById('productName');
    els.productVariant = document.getElementById('productVariant');
    els.productCode = document.getElementById('productCode');
    els.productQuantity = document.getElementById('productQuantity');
    els.productMinimum = document.getElementById('productMinimum');
    els.productCost = document.getElementById('productCost');
    els.productSalePrice = document.getElementById('productSalePrice');
    els.btnCloseProductModal = document.getElementById('btnCloseProductModal');
    els.btnCancelProductModal = document.getElementById('btnCancelProductModal');

    els.bulkScanInput = document.getElementById('bulkScanInput');
    els.bulkExistingNotice = document.getElementById('bulkExistingNotice');
    els.bulkProductForm = document.getElementById('bulkProductForm');
    els.bulkProductCode = document.getElementById('bulkProductCode');
    els.bulkProductCategory = document.getElementById('bulkProductCategory');
    els.bulkProductName = document.getElementById('bulkProductName');
    els.bulkProductVariant = document.getElementById('bulkProductVariant');
    els.bulkProductQuantity = document.getElementById('bulkProductQuantity');
    els.bulkProductMinimum = document.getElementById('bulkProductMinimum');
    els.bulkProductCost = document.getElementById('bulkProductCost');
    els.bulkProductSalePrice = document.getElementById('bulkProductSalePrice');
    els.btnCancelBulkProduct = document.getElementById('btnCancelBulkProduct');
    els.bulkSessionCount = document.getElementById('bulkSessionCount');
    els.bulkSessionTableBody = document.getElementById('bulkSessionTableBody');
    els.btnFinishBulkSession = document.getElementById('btnFinishBulkSession');

    els.suppliersSearch = document.getElementById('suppliersSearch');
    els.suppliersTableBody = document.getElementById('suppliersTableBody');
    els.btnNewSupplier = document.getElementById('btnNewSupplier');

    els.supplierModal = document.getElementById('supplierModal');
    els.supplierModalTitle = document.getElementById('supplierModalTitle');
    els.supplierForm = document.getElementById('supplierForm');
    els.supplierId = document.getElementById('supplierId');
    els.supplierName = document.getElementById('supplierName');
    els.supplierCnpj = document.getElementById('supplierCnpj');
    els.supplierPhone = document.getElementById('supplierPhone');
    els.supplierEmail = document.getElementById('supplierEmail');
    els.supplierObservation = document.getElementById('supplierObservation');
    els.btnCloseSupplierModal = document.getElementById('btnCloseSupplierModal');
    els.btnCancelSupplierModal = document.getElementById('btnCancelSupplierModal');

    els.stockEntrySupplier = document.getElementById('stockEntrySupplier');
    els.stockEntryInvoice = document.getElementById('stockEntryInvoice');
    els.stockEntryObservation = document.getElementById('stockEntryObservation');
    els.stockEntryItemForm = document.getElementById('stockEntryItemForm');
    els.stockEntryProduct = document.getElementById('stockEntryProduct');
    els.stockEntryQuantity = document.getElementById('stockEntryQuantity');
    els.stockEntryCost = document.getElementById('stockEntryCost');
    els.stockEntryItemsTableBody = document.getElementById('stockEntryItemsTableBody');
    els.stockEntryTotal = document.getElementById('stockEntryTotal');
    els.btnRegisterStockEntry = document.getElementById('btnRegisterStockEntry');
    els.stockEntriesList = document.getElementById('stockEntriesList');
    els.btnRefreshStockEntries = document.getElementById('btnRefreshStockEntries');

    els.clientsSearch = document.getElementById('clientsSearch');
    els.clientsTableBody = document.getElementById('clientsTableBody');
    els.btnNewClient = document.getElementById('btnNewClient');

    els.clientModal = document.getElementById('clientModal');
    els.clientModalTitle = document.getElementById('clientModalTitle');
    els.clientForm = document.getElementById('clientForm');
    els.clientId = document.getElementById('clientId');
    els.clientName = document.getElementById('clientName');
    els.clientPhone = document.getElementById('clientPhone');
    els.clientEmail = document.getElementById('clientEmail');
    els.clientObservation = document.getElementById('clientObservation');
    els.btnCloseClientModal = document.getElementById('btnCloseClientModal');
    els.btnCancelClientModal = document.getElementById('btnCancelClientModal');

    els.btnRefreshOpenOrders = document.getElementById('btnRefreshOpenOrders');
    els.openOrdersList = document.getElementById('openOrdersList');

    els.returnOrderSearch = document.getElementById('returnOrderSearch');
    els.btnSearchReturnOrder = document.getElementById('btnSearchReturnOrder');
    els.returnOrderResult = document.getElementById('returnOrderResult');
    els.btnRefreshReturns = document.getElementById('btnRefreshReturns');
    els.returnsList = document.getElementById('returnsList');

    els.openCashForm = document.getElementById('openCashForm');
    els.closeCashForm = document.getElementById('closeCashForm');
    els.cashOpenDate = document.getElementById('cashOpenDate');
    els.cashCloseDate = document.getElementById('cashCloseDate');
    els.cashOperator = document.getElementById('cashOperator');
    els.cashInitialBalance = document.getElementById('cashInitialBalance');
    els.cashOpenObservation = document.getElementById('cashOpenObservation');
    els.cashWithdrawals = document.getElementById('cashWithdrawals');
    els.cashExpenses = document.getElementById('cashExpenses');
    els.cashMovementForm = document.getElementById('cashMovementForm');
    els.cashMovementType = document.getElementById('cashMovementType');
    els.cashMovementValue = document.getElementById('cashMovementValue');
    els.cashMovementReason = document.getElementById('cashMovementReason');
    els.cashMovementsList = document.getElementById('cashMovementsList');
    els.cashReportedBalance = document.getElementById('cashReportedBalance');
    els.cashCloseObservation = document.getElementById('cashCloseObservation');
    els.btnPdfDaily = document.getElementById('btnPdfDaily');

    els.cashMoney = document.getElementById('cashMoney');
    els.cashPix = document.getElementById('cashPix');
    els.cashDebit = document.getElementById('cashDebit');
    els.cashCredit = document.getElementById('cashCredit');
    els.cashOther = document.getElementById('cashOther');
    els.cashSalesTotal = document.getElementById('cashSalesTotal');

    els.reportRevenue = document.getElementById('reportRevenue');
    els.reportCost = document.getElementById('reportCost');
    els.reportProfit = document.getElementById('reportProfit');
    els.reportAverageTicket = document.getElementById('reportAverageTicket');
    els.reportDas = document.getElementById('reportDas');
    els.dailyReportDate = document.getElementById('dailyReportDate');
    els.monthlyReportInput = document.getElementById('monthlyReportInput');
    els.annualReportYear = document.getElementById('annualReportYear');
    els.btnDailyReport = document.getElementById('btnDailyReport');
    els.btnMonthlyReport = document.getElementById('btnMonthlyReport');
    els.btnAnnualReport = document.getElementById('btnAnnualReport');
    els.btnPdfMonthly = document.getElementById('btnPdfMonthly');
    els.btnLoadPdfReports = document.getElementById('btnLoadPdfReports');
    els.pdfReportsList = document.getElementById('pdfReportsList');
    els.salesReportTableBody = document.getElementById('salesReportTableBody');
    els.paymentChart = document.getElementById('paymentChart');

    els.btnRunHealth = document.getElementById('btnRunHealth');
    els.healthResult = document.getElementById('healthResult');
    els.btnLoadLogs = document.getElementById('btnLoadLogs');
    els.logsList = document.getElementById('logsList');

    els.btnBackupManual = document.getElementById('btnBackupManual');
    els.btnLoadBackups = document.getElementById('btnLoadBackups');
    els.backupsList = document.getElementById('backupsList');

    els.loginModal = document.getElementById('loginModal');
    els.loginForm = document.getElementById('loginForm');
    els.operatorPinInput = document.getElementById('operatorPinInput');
    els.btnLogin = document.getElementById('btnLogin');
    els.loginFeedback = document.getElementById('loginFeedback');

    els.adminPinModal = document.getElementById('adminPinModal');
    els.adminPinForm = document.getElementById('adminPinForm');
    els.adminPinTitle = document.getElementById('adminPinTitle');
    els.adminPinDescription = document.getElementById('adminPinDescription');
    els.adminPinInput = document.getElementById('adminPinInput');
    els.adminPinFeedback = document.getElementById('adminPinFeedback');
    els.btnCloseAdminPinModal = document.getElementById('btnCloseAdminPinModal');
    els.btnCancelAdminPinModal = document.getElementById('btnCancelAdminPinModal');
    els.btnConfirmAdminPin = document.getElementById('btnConfirmAdminPin');
  }

  function bindEvents() {
    els.btnSync.addEventListener('click', fullSync);
    els.btnOpenCashHeader.addEventListener('click', () => switchView('caixa'));
    els.btnLogout.addEventListener('click', logoutOperator);

    els.loginForm.addEventListener('submit', handleLoginSubmit);

    els.adminPinForm.addEventListener('submit', handleAdminPinSubmit);
    els.btnCloseAdminPinModal.addEventListener('click', cancelAdminPinRequest);
    els.btnCancelAdminPinModal.addEventListener('click', cancelAdminPinRequest);

    els.navButtons.forEach(button => {
      button.addEventListener('click', () => switchView(button.dataset.viewTarget));
    });

    els.pdvProductSearch.addEventListener('input', renderPDVProducts);

    if (els.barcodeInput) {
      els.barcodeInput.addEventListener('keydown', handleBarcodeKeyDown);
      els.barcodeInput.addEventListener('input', handleBarcodeInput);
    }

    els.categoryFilter.addEventListener('click', handleCategoryFilter);

    els.btnCreateOrder.addEventListener('click', createNewOrder);
    els.btnSaveOpenOrder.addEventListener('click', saveOpenOrder);
    els.btnFinishOrder.addEventListener('click', finishCurrentOrder);
    els.btnCancelOrder.addEventListener('click', cancelCurrentOrder);
    els.orderDiscountInput.addEventListener('input', renderCurrentOrder);
    els.orderClientSelect.addEventListener('change', handleOrderClientChange);

    els.checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    els.btnCloseCheckoutModal.addEventListener('click', closeCheckoutModal);
    els.btnCancelCheckout.addEventListener('click', closeCheckoutModal);
    els.checkoutMethods.addEventListener('click', handleCheckoutMethodClick);
    els.checkoutQuickValues.addEventListener('click', handleCheckoutQuickValueClick);
    els.checkoutReceivedInput.addEventListener('input', renderCheckoutChange);
    els.checkoutModal.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeCheckoutModal();
      }
    });

    els.productsSearch.addEventListener('input', renderProductsTable);
    els.btnNewProduct.addEventListener('click', () => openProductModal());
    els.productForm.addEventListener('submit', handleProductSubmit);
    els.btnCloseProductModal.addEventListener('click', closeProductModal);
    els.btnCancelProductModal.addEventListener('click', closeProductModal);

    if (els.bulkScanInput) {
      els.bulkScanInput.addEventListener('keydown', handleBulkScanKeyDown);
    }

    els.bulkProductForm.addEventListener('submit', handleBulkProductSubmit);
    els.btnCancelBulkProduct.addEventListener('click', cancelBulkProductForm);
    els.btnFinishBulkSession.addEventListener('click', finishBulkSession);

    els.suppliersSearch.addEventListener('input', renderSuppliersTable);
    els.btnNewSupplier.addEventListener('click', () => openSupplierModal());
    els.supplierForm.addEventListener('submit', handleSupplierSubmit);
    els.btnCloseSupplierModal.addEventListener('click', closeSupplierModal);
    els.btnCancelSupplierModal.addEventListener('click', closeSupplierModal);

    els.stockEntryItemForm.addEventListener('submit', handleAddStockEntryItem);
    els.btnRegisterStockEntry.addEventListener('click', handleRegisterStockEntry);
    els.btnRefreshStockEntries.addEventListener('click', loadStockEntries);

    els.clientsSearch.addEventListener('input', renderClientsTable);
    els.btnNewClient.addEventListener('click', () => openClientModal());
    els.clientForm.addEventListener('submit', handleClientSubmit);
    els.btnCloseClientModal.addEventListener('click', closeClientModal);
    els.btnCancelClientModal.addEventListener('click', closeClientModal);

    els.btnRefreshOpenOrders.addEventListener('click', fetchOpenOrders);

    els.btnSearchReturnOrder.addEventListener('click', searchReturnOrder);
    els.btnRefreshReturns.addEventListener('click', loadRecentReturns);

    els.openCashForm.addEventListener('submit', handleOpenCash);
    els.closeCashForm.addEventListener('submit', handleCloseCash);
    els.cashMovementForm.addEventListener('submit', handleRegisterCashMovement);
    els.btnPdfDaily.addEventListener('click', generateDailyPdf);

    els.btnDailyReport.addEventListener('click', loadDailyReport);
    els.btnMonthlyReport.addEventListener('click', loadMonthlyReport);
    els.btnAnnualReport.addEventListener('click', loadAnnualReport);
    els.btnPdfMonthly.addEventListener('click', generateMonthlyPdf);
    els.btnLoadPdfReports.addEventListener('click', loadPdfReports);

    els.btnRunHealth.addEventListener('click', () => runHealthCheck(true));
    els.btnLoadLogs.addEventListener('click', loadLogs);

    els.btnBackupManual.addEventListener('click', runManualBackup);
    els.btnLoadBackups.addEventListener('click', loadBackups);

    document.addEventListener('click', handleDynamicClicks);
  }

  function setDefaultDates() {
    const today = getTodayInputValue();
    const now = new Date();

    els.cashOpenDate.value = today;
    els.cashCloseDate.value = today;
    els.dailyReportDate.value = today;
    els.monthlyReportInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    els.annualReportYear.value = now.getFullYear();
  }

  async function loadNetworkAddress() {
    try {
      const config = await ReloadAPI.obterConfig();
      const addresses = config.enderecosRede || [];

      if (!addresses.length) {
        els.networkAddress.textContent = 'Somente este computador';
        return;
      }

      const text = addresses.join(' ou ');

      els.networkAddress.textContent = text;

      els.loginNetworkAddress.textContent = `Para acessar de outro aparelho na mesma rede Wi-Fi, abra: ${text}`;
      els.loginNetworkAddress.classList.remove('hidden');
    } catch (error) {
      els.networkAddress.textContent = 'Não foi possível detectar';
      logError('loadNetworkAddress', error);
    }
  }

  // =============================
  // LOGIN / OPERADOR
  // =============================

  async function handleLoginSubmit(event) {
    event.preventDefault();

    const pin = els.operatorPinInput.value.trim();

    if (!pin) {
      showLoginFeedback('Informe o PIN do operador.', 'error');
      return;
    }

    try {
      setButtonLoading(els.btnLogin, true, 'Entrando...');

      const operator = await ReloadAPI.loginOperador(pin);

      state.currentOperator = operator;
      saveStoredOperator(operator);
      renderOperator();
      hideLoginModal();

      els.operatorPinInput.value = '';
      showFeedback(`Bem-vindo, ${operator.nome}.`, 'success');

      await bootAfterLogin();
    } catch (error) {
      showLoginFeedback(error.message, 'error');
      logError('handleLoginSubmit', error);
    } finally {
      setButtonLoading(els.btnLogin, false, 'Entrar');
    }
  }

  function logoutOperator() {
    const confirmed = confirm('Sair do sistema?');

    if (!confirmed) {
      return;
    }

    state.currentOperator = null;
    state.currentOrder = null;

    clearStoredOperator();
    clearCurrentOrderId();
    stopAutoSync();

    renderOperator();
    renderCurrentOrder();

    showLoginModal();
    setConnectionStatus('neutral', 'Aguardando login');
  }

  function showLoginModal() {
    els.loginModal.classList.remove('hidden');

    setTimeout(() => {
      els.operatorPinInput.focus();
    }, 80);
  }

  function hideLoginModal() {
    els.loginModal.classList.add('hidden');
  }

  function showLoginFeedback(message, type = 'info') {
    els.loginFeedback.textContent = message;
    els.loginFeedback.className = `feedback ${type}`;
  }

  function loadStoredOperator() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.OPERATOR);

      if (!raw) {
        state.currentOperator = null;
        return;
      }

      const operator = JSON.parse(raw);

      if (!operator || !operator.id || !operator.nome) {
        state.currentOperator = null;
        clearStoredOperator();
        return;
      }

      state.currentOperator = operator;
    } catch (error) {
      state.currentOperator = null;
      clearStoredOperator();
    }
  }

  function saveStoredOperator(operator) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.OPERATOR, JSON.stringify(operator));
  }

  function clearStoredOperator() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.OPERATOR);
  }

  function renderOperator() {
    if (!state.currentOperator) {
      els.currentOperatorName.textContent = 'Não logado';
      els.currentOperatorRole.textContent = '--';
      els.cashOperator.value = '';
      return;
    }

    els.currentOperatorName.textContent = state.currentOperator.nome;
    els.currentOperatorRole.textContent = state.currentOperator.perfil;
    els.cashOperator.value = state.currentOperator.nome;
  }

  function requireLoggedOperator() {
    if (!state.currentOperator || !state.currentOperator.id) {
      showLoginModal();
      throw new Error('Faça login para continuar.');
    }

    return state.currentOperator;
  }

  function getOperatorPayload() {
    const operator = requireLoggedOperator();

    return {
      operadorId: operator.id,
      operadorNome: operator.nome
    };
  }

  // =============================
  // PIN ADMIN
  // =============================

  function requestAdminPin(options = {}) {
    return new Promise(resolve => {
      state.adminPinResolve = resolve;
      state.adminActionContext = options;

      els.adminPinTitle.textContent = options.title || 'Confirmação de administrador';
      els.adminPinDescription.textContent = options.description || 'Informe o PIN de administrador para continuar.';
      els.adminPinFeedback.className = 'feedback hidden';
      els.adminPinFeedback.textContent = '';
      els.adminPinInput.value = '';

      els.adminPinModal.classList.remove('hidden');

      setTimeout(() => {
        els.adminPinInput.focus();
      }, 80);
    });
  }

  function handleAdminPinSubmit(event) {
    event.preventDefault();

    const pin = els.adminPinInput.value.trim();

    if (!pin) {
      els.adminPinFeedback.textContent = 'Informe o PIN de administrador.';
      els.adminPinFeedback.className = 'feedback error';
      return;
    }

    closeAdminPinModal();

    if (state.adminPinResolve) {
      state.adminPinResolve(pin);
    }

    state.adminPinResolve = null;
    state.adminActionContext = null;
  }

  function cancelAdminPinRequest() {
    closeAdminPinModal();

    if (state.adminPinResolve) {
      state.adminPinResolve(null);
    }

    state.adminPinResolve = null;
    state.adminActionContext = null;
  }

  function closeAdminPinModal() {
    els.adminPinModal.classList.add('hidden');
    els.adminPinInput.value = '';
    els.adminPinFeedback.className = 'feedback hidden';
    els.adminPinFeedback.textContent = '';
    focusBarcodeInput();
  }

  // =============================
  // SINCRONIZAÇÃO
  // =============================

  function startAutoSync() {
    stopAutoSync();

    state.autoSyncTimer = setInterval(() => {
      lightSync();
    }, CONFIG.AUTO_SYNC_INTERVAL_MS);
  }

  function stopAutoSync() {
    if (state.autoSyncTimer) {
      clearInterval(state.autoSyncTimer);
      state.autoSyncTimer = null;
    }
  }

  async function fullSync() {
    if (state.isSyncing) {
      return;
    }

    state.isSyncing = true;
    setButtonLoading(els.btnSync, true, 'Sincronizando...');
    setConnectionStatus('loading', 'Sincronizando...');

    try {
      await ReloadAPI.ping();

      const [products, clients, openOrders, cashDay, suppliers] = await Promise.all([
        ReloadAPI.listarProdutos(),
        ReloadAPI.listarClientes(),
        ReloadAPI.listarPedidosAbertos(),
        ReloadAPI.obterCaixaDia(getTodayInputValue()),
        ReloadAPI.listarFornecedores()
      ]);

      state.products = products;
      state.clients = clients;
      state.openOrders = openOrders;
      state.cashDay = cashDay;
      state.suppliers = suppliers;

      setConnectionStatus('online', 'Online');
      updateLastSync();

      renderAll();

      showFeedback('Sistema sincronizado com sucesso.', 'success');
    } catch (error) {
      setConnectionStatus('offline', 'Offline');
      showFeedback(error.message, 'error');
      logError('fullSync', error);
    } finally {
      state.isSyncing = false;
      setButtonLoading(els.btnSync, false, 'Sincronizar');
    }
  }

  async function lightSync() {
    if (state.isSyncing || state.isSubmitting || !state.currentOperator) {
      return;
    }

    try {
      await ReloadAPI.ping();

      const [products, openOrders, cashDay] = await Promise.all([
        ReloadAPI.listarProdutos(),
        ReloadAPI.listarPedidosAbertos(),
        ReloadAPI.obterCaixaDia(getTodayInputValue())
      ]);

      state.products = products;
      state.openOrders = openOrders;
      state.cashDay = cashDay;

      setConnectionStatus('online', 'Online');
      updateLastSync();

      renderPDVProducts();
      renderProductsTable();
      renderOpenOrders();
      renderCashStatus();
      renderCashSummary();
    } catch (error) {
      setConnectionStatus('offline', 'Offline');
      logError('lightSync', error);
    }
  }

  function renderAll() {
    renderOperator();
    renderClientSelect();
    renderCategoryFilter();
    renderPDVProducts();
    renderProductsTable();
    renderClientsTable();
    renderOpenOrders();
    renderCurrentOrder();
    renderCashStatus();
    renderCashSummary();
    renderSuppliersTable();
    renderSupplierSelect();
    renderStockEntryProductSelect();
  }

  function switchView(viewName) {
    state.activeView = viewName;

    els.navButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.viewTarget === viewName);
    });

    els.views.forEach(view => {
      view.classList.toggle('active', view.id === `view-${viewName}`);
    });

    if (viewName === 'caixa') {
      fetchCashDay();
    }

    if (viewName === 'pedidos' || viewName === 'clientes') {
      fetchOpenOrders();
    }

    if (viewName === 'devolucoes') {
      loadRecentReturns();
    }

    if (viewName === 'entradaestoque') {
      loadStockEntries();
    }

    if (viewName === 'relatorios') {
      loadPdfReports(false);
    }

    if (viewName === 'pdv') {
      focusBarcodeInput();
    }

    if (viewName === 'cadastromassa') {
      focusBulkScanInput();
    }
  }

  // =============================
  // PDV / PEDIDOS
  // =============================

  async function createNewOrder() {
    if (state.isSubmitting) {
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      state.isSubmitting = true;
      setButtonLoading(els.btnCreateOrder, true, 'Criando...');

      const clienteId = els.orderClientSelect.value;

      const payload = clienteId
        ? {
            clienteId,
            ...operatorPayload
          }
        : {
            clienteNome: CONFIG.DEFAULT_CLIENT_NAME,
            ...operatorPayload
          };

      const order = await ReloadAPI.criarPedido(payload);

      state.currentOrder = order;
      saveCurrentOrderId(order.id);

      await fetchOpenOrders();

      renderCurrentOrder();

      if (order.existente) {
        showFeedback(`${order.clienteNome} já tem uma comanda aberta. Ela foi reaberta.`, 'info');
      } else {
        showFeedback('Novo pedido criado.', 'success');
      }

      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('createNewOrder', error);
    } finally {
      state.isSubmitting = false;
      setButtonLoading(els.btnCreateOrder, false, 'Novo pedido');
    }
  }

  async function ensureCurrentOrder() {
    if (state.currentOrder && state.currentOrder.status === 'aberto') {
      return state.currentOrder;
    }

    const wasSubmitting = state.isSubmitting;
    state.isSubmitting = false;

    await createNewOrder();

    state.isSubmitting = wasSubmitting;

    if (!state.currentOrder) {
      throw new Error('Não foi possível criar o pedido.');
    }

    return state.currentOrder;
  }

  async function addProductToCurrentOrder(productId) {
    if (state.isSubmitting) {
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      state.isSubmitting = true;

      const product = state.products.find(item => item.id === productId);

      if (!product) {
        throw new Error('Produto não encontrado.');
      }

      if (product.quantidade <= 0) {
        throw new Error('Produto zerado no estoque.');
      }

      const order = await ensureCurrentOrder();

      const updatedOrder = await ReloadAPI.adicionarItemPedido({
        pedidoId: order.id,
        produtoId: product.id,
        quantidade: 1,
        ...operatorPayload
      });

      state.currentOrder = updatedOrder;
      saveCurrentOrderId(updatedOrder.id);

      renderCurrentOrder();

      showFeedback(`${product.nome} adicionado ao pedido.`, 'success');
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('addProductToCurrentOrder', error);
    } finally {
      state.isSubmitting = false;
    }
  }

  async function removeOrderItem(itemId) {
    if (!state.currentOrder || state.isSubmitting) {
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      state.isSubmitting = true;

      const updatedOrder = await ReloadAPI.removerItemPedido(itemId, operatorPayload.operadorId);

      state.currentOrder = updatedOrder;
      renderCurrentOrder();

      showFeedback('Item removido do pedido.', 'success');
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('removeOrderItem', error);
    } finally {
      state.isSubmitting = false;
    }
  }

  async function promptItemDiscount(itemId, currentDiscount) {
    if (!state.currentOrder || state.isSubmitting) {
      return;
    }

    const input = prompt('Desconto para este item (R$):', currentDiscount || '0');

    if (input === null) {
      return;
    }

    const desconto = parseMoneyInput(input);

    try {
      state.isSubmitting = true;

      const updatedOrder = await ReloadAPI.aplicarDescontoItem(itemId, desconto);

      state.currentOrder = updatedOrder;
      renderCurrentOrder();

      showFeedback('Desconto aplicado ao item.', 'success');
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('promptItemDiscount', error);
    } finally {
      state.isSubmitting = false;
    }
  }

  function saveOpenOrder() {
    if (!state.currentOrder) {
      showFeedback('Nenhum pedido aberto para salvar.', 'info');
      return;
    }

    showFeedback('Pedido já está salvo em aberto.', 'success');
    switchView('pedidos');
    fetchOpenOrders();
  }

  async function finishCurrentOrder() {
    if (state.isSubmitting) {
      return;
    }

    if (!state.currentOrder) {
      showFeedback('Nenhum pedido aberto para finalizar.', 'error');
      return;
    }

    if (!state.currentOrder.itens || !state.currentOrder.itens.length) {
      showFeedback('Adicione pelo menos um produto antes de finalizar.', 'error');
      return;
    }

    if (CONFIG.REQUIRE_OPEN_CASH_TO_SELL && !isCashOpen()) {
      showFeedback('Abra o caixa antes de finalizar vendas.', 'error');
      switchView('caixa');
      return;
    }

    openCheckoutModal();
  }

  // =============================
  // FINALIZAR VENDA / TROCO
  // =============================

  function openCheckoutModal() {
    const total = calculateCurrentOrderTotal();

    state.checkoutRequestId = generateRequestId('VENDA');
    state.checkoutMethod = els.paymentMethodSelect.value || CONFIG.DEFAULT_PAYMENT_METHOD;

    els.checkoutClient.textContent = state.currentOrder.clienteNome || CONFIG.DEFAULT_CLIENT_NAME;
    els.checkoutTotal.textContent = formatCurrency(total);
    els.checkoutReceivedInput.value = '';
    els.checkoutFeedback.classList.add('hidden');

    els.checkoutQuickValues.innerHTML = [
      `<button class="chip" type="button" data-quick-value="${total.toFixed(2)}">Exato</button>`,
      ...getQuickCashValues(total).map(value => `
        <button class="chip" type="button" data-quick-value="${value}">${formatCurrency(value)}</button>
      `)
    ].join('');

    renderCheckoutMethods();
    els.checkoutModal.classList.remove('hidden');
    focusCheckoutField();
  }

  function closeCheckoutModal() {
    if (state.isSubmitting) {
      return;
    }

    els.checkoutModal.classList.add('hidden');
    focusBarcodeInput();
  }

  function focusCheckoutField() {
    setTimeout(() => {
      if (state.checkoutMethod === 'dinheiro') {
        els.checkoutReceivedInput.focus();
      } else {
        els.btnConfirmCheckout.focus();
      }
    }, 50);
  }

  // Notas que o cliente costuma entregar: arredonda o total para cima em cada nota.
  function getQuickCashValues(total) {
    const values = new Set();

    [5, 10, 20, 50, 100, 200].forEach(note => {
      const value = Math.ceil((total + 0.001) / note) * note;

      if (value > total) {
        values.add(value);
      }
    });

    return [...values].sort((a, b) => a - b).slice(0, 4);
  }

  function renderCheckoutMethods() {
    els.checkoutMethods.innerHTML = CONFIG.PAYMENT_METHODS.map(method => `
      <button
        class="chip ${method.value === state.checkoutMethod ? 'active' : ''}"
        type="button"
        data-checkout-method="${method.value}"
      >${escapeHtml(method.label)}</button>
    `).join('');

    els.checkoutCashBox.classList.toggle('hidden', state.checkoutMethod !== 'dinheiro');
    renderCheckoutChange();
  }

  function handleCheckoutMethodClick(event) {
    const button = event.target.closest('[data-checkout-method]');

    if (!button) {
      return;
    }

    state.checkoutMethod = button.dataset.checkoutMethod;
    els.paymentMethodSelect.value = state.checkoutMethod;
    renderCheckoutMethods();
    focusCheckoutField();
  }

  function handleCheckoutQuickValueClick(event) {
    const button = event.target.closest('[data-quick-value]');

    if (!button) {
      return;
    }

    els.checkoutReceivedInput.value = Number(button.dataset.quickValue).toFixed(2).replace('.', ',');
    renderCheckoutChange();
    els.btnConfirmCheckout.focus();
  }

  function getCheckoutReceived() {
    const raw = els.checkoutReceivedInput.value.trim();
    return raw ? parseMoneyInput(raw) : null;
  }

  function renderCheckoutChange() {
    const total = calculateCurrentOrderTotal();
    const received = getCheckoutReceived();
    const isCash = state.checkoutMethod === 'dinheiro';

    els.checkoutChangeBox.classList.remove('is-missing');

    if (!isCash || received === null) {
      els.checkoutChangeLabel.textContent = 'Troco';
      els.checkoutChange.textContent = formatCurrency(0);
      return;
    }

    if (received + 0.005 < total) {
      els.checkoutChangeBox.classList.add('is-missing');
      els.checkoutChangeLabel.textContent = 'Falta';
      els.checkoutChange.textContent = formatCurrency(total - received);
      return;
    }

    els.checkoutChangeLabel.textContent = 'Troco';
    els.checkoutChange.textContent = formatCurrency(received - total);
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();

    if (state.isSubmitting || !state.currentOrder) {
      return;
    }

    const total = calculateCurrentOrderTotal();
    const isCash = state.checkoutMethod === 'dinheiro';
    const received = isCash ? getCheckoutReceived() : null;

    if (received !== null && received + 0.005 < total) {
      showFeedback(`Valor recebido menor que o total. Falta ${formatCurrency(total - received)}.`, 'error');
      els.checkoutReceivedInput.focus();
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      state.isSubmitting = true;
      setButtonLoading(els.btnConfirmCheckout, true, 'Finalizando...');
      setButtonLoading(els.btnFinishOrder, true, 'Finalizando...');

      const result = await ReloadAPI.finalizarPedido({
        pedidoId: state.currentOrder.id,
        formaPagamento: state.checkoutMethod,
        desconto: parseMoneyInput(els.orderDiscountInput.value),
        valorRecebido: received,
        requestId: state.checkoutRequestId,
        ...operatorPayload
      });

      els.checkoutModal.classList.add('hidden');

      state.currentOrder = null;
      clearCurrentOrderId();
      els.orderClientSelect.value = '';
      els.orderDiscountInput.value = 0;
      els.paymentMethodSelect.value = CONFIG.DEFAULT_PAYMENT_METHOD;

      if (CONFIG.FULL_SYNC_AFTER_SALE) {
        await fullSync();
      } else {
        await lightSync();
      }

      // Depois da sincronização, para a mensagem dela não esconder o troco.
      const troco = Number(result.venda.troco || 0);
      const trocoTexto = troco > 0 ? ` Troco: ${formatCurrency(troco)}.` : '';

      if (result.duplicado) {
        showFeedback(`Venda já registrada anteriormente: ${formatCurrency(result.venda.total)}.${trocoTexto}`, 'info');
      } else {
        showFeedback(`Venda finalizada: ${formatCurrency(result.venda.total)}.${trocoTexto}`, 'success');
      }

      renderCurrentOrder();
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      els.checkoutFeedback.textContent = error.message;
      els.checkoutFeedback.className = 'feedback error';
      logError('finishCurrentOrder', error);
    } finally {
      state.isSubmitting = false;
      setButtonLoading(els.btnConfirmCheckout, false, 'Confirmar venda');
      setButtonLoading(els.btnFinishOrder, false, 'Finalizar venda');
    }
  }

  async function cancelCurrentOrder() {
    if (!state.currentOrder || state.isSubmitting) {
      showFeedback('Nenhum pedido aberto para eliminar.', 'info');
      return;
    }

    if (!state.currentOrder.itens || !state.currentOrder.itens.length) {
      await closeEmptyOrder(state.currentOrder.id);
      return;
    }

    const confirmed = confirm('Eliminar/cancelar este pedido em aberto?');

    if (!confirmed) {
      focusBarcodeInput();
      return;
    }

    const adminPin = await requestAdminPin({
      title: 'Cancelar pedido',
      description: 'Informe o PIN de administrador para cancelar/eliminar o pedido.'
    });

    if (!adminPin) {
      showFeedback('Cancelamento abortado.', 'info');
      return;
    }

    try {
      state.isSubmitting = true;
      setButtonLoading(els.btnCancelOrder, true, 'Eliminando...');

      await ReloadAPI.cancelarPedido(
        state.currentOrder.id,
        adminPin,
        'Pedido eliminado pelo operador.'
      );

      state.currentOrder = null;
      clearCurrentOrderId();

      await fetchOpenOrders();

      renderCurrentOrder();
      showFeedback('Pedido eliminado com sucesso.', 'success');
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('cancelCurrentOrder', error);
    } finally {
      state.isSubmitting = false;
      setButtonLoading(els.btnCancelOrder, false, getCancelOrderLabel());
    }
  }

  function getCancelOrderLabel() {
    const order = state.currentOrder;
    return order && (!order.itens || !order.itens.length) ? 'Fechar comanda' : 'Eliminar pedido';
  }

  // Comanda sem itens não tem o que perder: fecha direto, sem PIN de administrador.
  async function closeEmptyOrder(orderId) {
    if (state.isSubmitting) {
      return;
    }

    try {
      state.isSubmitting = true;

      await ReloadAPI.fecharComandaVazia({
        pedidoId: orderId,
        ...getOperatorPayload()
      });

      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder = null;
        clearCurrentOrderId();
        els.orderClientSelect.value = '';
        renderCurrentOrder();
      }

      await fetchOpenOrders();
      showFeedback('Comanda vazia fechada.', 'success');
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('closeEmptyOrder', error);
    } finally {
      state.isSubmitting = false;
    }
  }

  async function openExistingOrder(orderId) {
    try {
      const order = await ReloadAPI.obterPedido(orderId);

      if (order.status !== 'aberto') {
        throw new Error('Este pedido não está mais aberto.');
      }

      state.currentOrder = order;
      saveCurrentOrderId(order.id);

      renderCurrentOrder();
      switchView('pdv');

      showFeedback('Pedido carregado no PDV.', 'success');
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('openExistingOrder', error);
    }
  }

  async function cancelOpenOrder(orderId) {
    const confirmed = confirm('Cancelar este pedido em aberto?');

    if (!confirmed) {
      return;
    }

    const adminPin = await requestAdminPin({
      title: 'Cancelar pedido aberto',
      description: 'Informe o PIN de administrador para cancelar este pedido.'
    });

    if (!adminPin) {
      showFeedback('Cancelamento abortado.', 'info');
      return;
    }

    try {
      await ReloadAPI.cancelarPedido(
        orderId,
        adminPin,
        'Pedido cancelado na tela de pedidos abertos.'
      );

      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder = null;
        clearCurrentOrderId();
        renderCurrentOrder();
      }

      await fetchOpenOrders();
      showFeedback('Pedido cancelado.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('cancelOpenOrder', error);
    }
  }

  async function restoreCurrentOrder() {
    const orderId = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_ORDER_ID);

    if (!orderId) {
      return;
    }

    try {
      const order = await ReloadAPI.obterPedido(orderId);

      if (order && order.status === 'aberto') {
        state.currentOrder = order;
        renderCurrentOrder();
      } else {
        clearCurrentOrderId();
      }
    } catch (error) {
      clearCurrentOrderId();
      logError('restoreCurrentOrder', error);
    }
  }

  function renderCurrentOrder() {
    els.btnCancelOrder.textContent = getCancelOrderLabel();

    if (!state.currentOrder) {
      const pendingClient = state.clients.find(item => item.id === els.orderClientSelect.value);
      els.currentOrderId.textContent = pendingClient
        ? `Conta de ${pendingClient.nome} • lance o primeiro produto`
        : 'Nenhum pedido aberto';
      els.currentOrderItems.innerHTML = '<div class="empty-state">Nenhum item no pedido.</div>';
      els.orderSubtotal.textContent = formatCurrency(0);
      els.orderTotal.textContent = formatCurrency(0);
      els.orderDiscountInput.value = 0;
      return;
    }

    const operadorTexto = state.currentOrder.operadorNome
      ? ` • ${state.currentOrder.operadorNome}`
      : '';

    els.currentOrderId.textContent = `${state.currentOrder.id} • ${state.currentOrder.clienteNome}${operadorTexto}`;
    els.orderClientSelect.value = state.currentOrder.clienteId || '';

    const items = state.currentOrder.itens || [];

    if (!items.length) {
      els.currentOrderItems.innerHTML = '<div class="empty-state">Nenhum item no pedido.</div>';
    } else {
      els.currentOrderItems.innerHTML = items.map(item => {
        const discountNote = item.desconto > 0
          ? ` • desconto ${formatCurrency(item.desconto)}`
          : '';

        return `
        <div class="order-item">
          <div>
            <span class="order-item-title">${escapeHtml(item.produto)}</span>
            <span class="order-item-meta">${escapeHtml(item.variante || 'Sem variante')} • ${item.quantidade} x ${formatCurrency(item.valorUnitario)}${discountNote}</span>

            <div class="order-item-actions">
              <button class="btn btn-secondary btn-small" type="button" data-discount-order-item="${item.id}" data-current-discount="${item.desconto}">
                Desconto
              </button>
              <button class="btn btn-danger btn-small" type="button" data-remove-order-item="${item.id}">
                Remover
              </button>
            </div>
          </div>

          <div class="order-item-total">
            ${formatCurrency(item.total)}
          </div>
        </div>
      `;
      }).join('');
    }

    const subtotal = Number(state.currentOrder.subtotal || 0);
    const discount = parseMoneyInput(els.orderDiscountInput.value);
    const total = Math.max(0, subtotal - discount);

    els.orderSubtotal.textContent = formatCurrency(subtotal);
    els.orderTotal.textContent = formatCurrency(total);
  }

  function calculateCurrentOrderTotal() {
    if (!state.currentOrder) {
      return 0;
    }

    const subtotal = Number(state.currentOrder.subtotal || 0);
    const discount = parseMoneyInput(els.orderDiscountInput.value);

    return Math.max(0, subtotal - discount);
  }

  function saveCurrentOrderId(orderId) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_ORDER_ID, orderId);
  }

  function clearCurrentOrderId() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_ORDER_ID);
  }

  // =============================
  // CÓDIGO DE BARRAS
  // =============================

  function handleBarcodeKeyDown(event) {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    clearTimeout(state.barcodeTimer);

    const code = els.barcodeInput.value;

    processBarcode(code);
  }

  function handleBarcodeInput() {
    clearTimeout(state.barcodeTimer);

    const code = els.barcodeInput.value.trim();

    if (code.length < 6) {
      return;
    }

    state.barcodeTimer = setTimeout(() => {
      processBarcode(els.barcodeInput.value);
    }, 180);
  }

  async function processBarcode(rawCode) {
    const code = normalizeBarcode(rawCode);

    if (!code) {
      return;
    }

    const now = Date.now();

    if (state.lastBarcode === code && now - state.lastBarcodeAt < 900) {
      clearBarcodeInput();
      return;
    }

    state.lastBarcode = code;
    state.lastBarcodeAt = now;

    const product = findProductByBarcode(code);

    if (!product) {
      showFeedback(`Produto não encontrado para o código: ${code}`, 'error');
      clearBarcodeInput();
      focusBarcodeInput();
      return;
    }

    if (product.quantidade <= 0) {
      showFeedback(`${product.nome} está zerado no estoque.`, 'error');
      clearBarcodeInput();
      focusBarcodeInput();
      return;
    }

    try {
      await addProductToCurrentOrder(product.id);
      clearBarcodeInput();
      focusBarcodeInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('processBarcode', error);
      clearBarcodeInput();
      focusBarcodeInput();
    }
  }

  function findProductByBarcode(code) {
    const rawCode = String(code || '').trim();
    const digitsCode = rawCode.replace(/\D/g, '');

    return state.products.find(product => {
      const productCode = String(product.codigo || '').trim();
      const productDigits = productCode.replace(/\D/g, '');

      return productCode === rawCode || Boolean(digitsCode && productDigits === digitsCode);
    });
  }

  function normalizeBarcode(value) {
    return String(value || '').trim();
  }

  function clearBarcodeInput() {
    if (!els.barcodeInput) {
      return;
    }

    els.barcodeInput.value = '';
  }

  function focusBarcodeInput() {
    if (!els.barcodeInput || state.activeView !== 'pdv' || els.loginModal && !els.loginModal.classList.contains('hidden')) {
      return;
    }

    setTimeout(() => {
      els.barcodeInput.focus();
    }, 80);
  }

  // =============================
  // PRODUTOS PDV
  // =============================

  function renderCategoryFilter() {
    const categories = getCategories();

    els.categoryFilter.innerHTML = `
      <button class="chip ${state.activeCategory === 'todos' ? 'active' : ''}" type="button" data-category-filter="todos">
        Todos
      </button>
      ${categories.map(category => `
        <button class="chip ${state.activeCategory === category ? 'active' : ''}" type="button" data-category-filter="${escapeHtml(category)}">
          ${escapeHtml(category)}
        </button>
      `).join('')}
    `;
  }

  function handleCategoryFilter(event) {
    const button = event.target.closest('[data-category-filter]');

    if (!button) {
      return;
    }

    state.activeCategory = button.dataset.categoryFilter;

    renderCategoryFilter();
    renderPDVProducts();
    focusBarcodeInput();
  }

  function renderPDVProducts() {
    const search = normalizeText(els.pdvProductSearch.value);

    const products = state.products.filter(product => {
      const matchesSearch = !search || normalizeText([
        product.nome,
        product.categoria,
        product.variante,
        product.codigo
      ].join(' ')).includes(search);

      const matchesCategory = state.activeCategory === 'todos' || product.categoria === state.activeCategory;

      return matchesSearch && matchesCategory;
    });

    if (!products.length) {
      els.pdvProductSections.innerHTML = '<div class="empty-state">Nenhum produto encontrado.</div>';
      return;
    }

    const grouped = groupBy(products, 'categoria');

    els.pdvProductSections.innerHTML = Object.keys(grouped).sort().map(category => `
      <section class="product-section">
        <h3>${escapeHtml(category || 'Sem categoria')}</h3>

        <div class="product-grid">
          ${grouped[category].map(product => `
            <button class="product-card" type="button" data-add-product="${product.id}" ${product.quantidade <= 0 ? 'disabled' : ''}>
              <div>
                <span class="product-card-name">${escapeHtml(product.nome)}</span>
                <span class="product-card-variant">${escapeHtml(product.variante || 'Sem variante')}</span>
                ${product.codigo ? `<span class="product-card-code">Cod: ${escapeHtml(product.codigo)}</span>` : ''}
              </div>

              <div>
                <span class="product-card-price">${formatCurrency(product.venda)}</span>
                <span class="product-card-stock">Estoque: ${product.quantidade}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </section>
    `).join('');
  }

  
  // PRODUTOS CADASTRO
  
  function renderProductsTable() {
    const search = normalizeText(els.productsSearch.value);

    const products = state.products.filter(product => {
      if (!search) {
        return true;
      }

      return normalizeText([
        product.nome,
        product.categoria,
        product.variante,
        product.codigo
      ].join(' ')).includes(search);
    });

    if (!products.length) {
      els.productsTableBody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhum produto encontrado.</td></tr>';
      return;
    }

    els.productsTableBody.innerHTML = products.map(product => {
      const status = getProductStatus(product);

      return `
        <tr>
          <td>
            <span class="product-name">${escapeHtml(product.nome)}</span>
            <span class="product-id">${escapeHtml(product.id)} ${product.variante ? '• ' + escapeHtml(product.variante) : ''}</span>
          </td>
          <td>${escapeHtml(product.categoria)}</td>
          <td>${escapeHtml(product.codigo || '--')}</td>
          <td>${product.quantidade}</td>
          <td>${product.minimo}</td>
          <td>${formatCurrency(product.custo)}</td>
          <td>${formatCurrency(product.venda)}</td>
          <td><span class="status-badge ${status.className}">${status.label}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-small" type="button" data-edit-product="${product.id}">Editar</button>
              <button class="btn btn-danger btn-small" type="button" data-archive-product="${product.id}">Arquivar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openProductModal(product = null) {
    els.productForm.reset();

    if (product) {
      els.productModalTitle.textContent = 'Editar produto';
      els.productId.value = product.id;
      els.productCategory.value = product.categoria;
      els.productName.value = product.nome;
      els.productVariant.value = product.variante || '';
      els.productCode.value = product.codigo || '';
      els.productQuantity.value = product.quantidade;
      els.productMinimum.value = product.minimo;
      els.productCost.value = product.custo;
      els.productSalePrice.value = product.venda;
    } else {
      els.productModalTitle.textContent = 'Novo produto';
      els.productId.value = '';
      els.productQuantity.value = 0;
      els.productMinimum.value = 0;
      els.productCost.value = 0;
      els.productSalePrice.value = 0;
    }

    els.productModal.classList.remove('hidden');
    els.productName.focus();
  }

  function closeProductModal() {
    els.productModal.classList.add('hidden');
    focusBarcodeInput();
  }

  async function handleProductSubmit(event) {
    event.preventDefault();

    try {
      const operatorPayload = getOperatorPayload();

      const product = {
        id: els.productId.value,
        categoria: els.productCategory.value,
        nome: els.productName.value,
        variante: els.productVariant.value,
        codigo: els.productCode.value,
        quantidade: els.productQuantity.value,
        minimo: els.productMinimum.value,
        custo: els.productCost.value,
        venda: els.productSalePrice.value,
        ...operatorPayload
      };

      if (product.id) {
        await ReloadAPI.editarProduto(product);
        showFeedback('Produto editado com sucesso.', 'success');
      } else {
        await ReloadAPI.adicionarProduto(product);
        showFeedback('Produto cadastrado com sucesso.', 'success');
      }

      closeProductModal();
      await fullSync();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleProductSubmit', error);
    }
  }

  async function archiveProduct(productId) {
    const confirmed = confirm('Arquivar este produto?');

    if (!confirmed) {
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      await ReloadAPI.arquivarProduto(productId, operatorPayload.operadorId);

      showFeedback('Produto arquivado.', 'success');
      await fullSync();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('archiveProduct', error);
    }
  }


  // CADASTRO EM MASSA (LEITOR DE CÓDIGO DE BARRAS)


  function focusBulkScanInput() {
    if (!els.bulkScanInput || state.activeView !== 'cadastromassa') {
      return;
    }

    setTimeout(() => {
      els.bulkScanInput.focus();
    }, 80);
  }

  function handleBulkScanKeyDown(event) {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const code = els.bulkScanInput.value.trim();
    els.bulkScanInput.value = '';

    if (!code) {
      return;
    }

    processBulkScan(code);
  }

  function processBulkScan(code) {
    const existing = findProductByBarcode(code);

    if (existing) {
      showBulkExistingNotice(existing);
      closeBulkProductForm();
      focusBulkScanInput();
      return;
    }

    hideBulkExistingNotice();
    openBulkProductForm(code);
  }

  function showBulkExistingNotice(product) {
    const variantText = product.variante ? ` • ${product.variante}` : '';

    els.bulkExistingNotice.textContent =
      `Produto já cadastrado: ${product.nome}${variantText} (estoque atual: ${product.quantidade}). Edite o estoque na tela de Produtos.`;
    els.bulkExistingNotice.className = 'feedback info';
  }

  function hideBulkExistingNotice() {
    els.bulkExistingNotice.className = 'feedback hidden';
    els.bulkExistingNotice.textContent = '';
  }

  function openBulkProductForm(code) {
    els.bulkProductForm.reset();
    els.bulkProductForm.classList.remove('hidden');

    els.bulkProductCode.value = code;
    els.bulkProductCategory.value = state.bulkSession.lastCategory || '';
    els.bulkProductQuantity.value = 1;
    els.bulkProductMinimum.value = 0;
    els.bulkProductCost.value = 0;
    els.bulkProductSalePrice.value = 0;

    setTimeout(() => {
      els.bulkProductName.focus();
    }, 80);
  }

  function closeBulkProductForm() {
    els.bulkProductForm.classList.add('hidden');
    els.bulkProductForm.reset();
  }

  function cancelBulkProductForm() {
    closeBulkProductForm();
    focusBulkScanInput();
  }

  async function handleBulkProductSubmit(event) {
    event.preventDefault();

    try {
      const operatorPayload = getOperatorPayload();

      const product = {
        categoria: els.bulkProductCategory.value,
        nome: els.bulkProductName.value,
        variante: els.bulkProductVariant.value,
        codigo: els.bulkProductCode.value,
        quantidade: els.bulkProductQuantity.value,
        minimo: els.bulkProductMinimum.value,
        custo: els.bulkProductCost.value,
        venda: els.bulkProductSalePrice.value,
        ...operatorPayload
      };

      const saved = await ReloadAPI.adicionarProduto(product);

      state.bulkSession.lastCategory = saved.categoria;
      state.bulkSession.items.unshift(saved);
      renderBulkSessionList();

      await lightSync();

      showFeedback(`${saved.nome} cadastrado.`, 'success');
      closeBulkProductForm();
      focusBulkScanInput();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleBulkProductSubmit', error);
    }
  }

  function renderBulkSessionList() {
    els.bulkSessionCount.textContent = state.bulkSession.items.length;

    if (!state.bulkSession.items.length) {
      els.bulkSessionTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhum produto cadastrado nesta sessão ainda.</td></tr>';
      return;
    }

    els.bulkSessionTableBody.innerHTML = state.bulkSession.items.map(product => `
      <tr>
        <td>
          ${escapeHtml(product.nome)}
          ${product.variante ? `<span class="product-id">• ${escapeHtml(product.variante)}</span>` : ''}
        </td>
        <td>${escapeHtml(product.codigo || '--')}</td>
        <td>${product.quantidade}</td>
        <td>${formatCurrency(product.venda)}</td>
      </tr>
    `).join('');
  }

  async function finishBulkSession() {
    state.bulkSession.items = [];
    state.bulkSession.lastCategory = '';

    renderBulkSessionList();
    hideBulkExistingNotice();
    closeBulkProductForm();

    await fullSync();
    switchView('produtos');
  }


  // CLIENTES


  function renderClientSelect() {
    const selected = els.orderClientSelect.value;

    els.orderClientSelect.innerHTML = `
      <option value="">${CONFIG.DEFAULT_CLIENT_NAME}</option>
      ${state.clients.map(client => `
        <option value="${client.id}">${escapeHtml(client.nome)}</option>
      `).join('')}
    `;

    els.orderClientSelect.value = state.clients.some(client => client.id === selected) ? selected : '';
  }

  function findOpenOrderForClient(clientId) {
    return state.openOrders.find(order => order.clienteId === clientId) || null;
  }

  // Abre a conta do cliente: retoma o pedido em aberto dele ou prepara um novo,
  // que é criado assim que o primeiro produto for lançado.
  async function openClientAccount(clientId) {
    const client = state.clients.find(item => item.id === clientId);

    if (!client) {
      showFeedback('Cliente não encontrado.', 'error');
      return;
    }

    await fetchOpenOrders();

    const openOrder = findOpenOrderForClient(clientId);

    if (openOrder) {
      await openExistingOrder(openOrder.id);
      showFeedback(`Conta de ${client.nome} aberta: ${formatCurrency(openOrder.total)}.`, 'success');
      return;
    }

    state.currentOrder = null;
    clearCurrentOrderId();
    els.orderClientSelect.value = clientId;
    els.orderDiscountInput.value = 0;

    renderCurrentOrder();
    switchView('pdv');
    showFeedback(`Nova conta para ${client.nome}. Lance os produtos.`, 'success');
  }

  async function handleOrderClientChange() {
    const clientId = els.orderClientSelect.value;
    const current = state.currentOrder;
    const currentClientId = current ? current.clienteId || '' : '';

    if (current && currentClientId === clientId) {
      return;
    }

    if (current && !currentClientId && current.itens && current.itens.length) {
      const nome = clientId
        ? (state.clients.find(item => item.id === clientId) || {}).nome
        : CONFIG.DEFAULT_CLIENT_NAME;
      const confirmed = confirm(`O pedido atual tem itens e vai ficar salvo em "Pedidos em aberto".\nAbrir a conta de ${nome}?`);

      if (!confirmed) {
        els.orderClientSelect.value = currentClientId;
        return;
      }
    }

    if (clientId) {
      await openClientAccount(clientId);
      return;
    }

    state.currentOrder = null;
    clearCurrentOrderId();
    els.orderDiscountInput.value = 0;
    renderCurrentOrder();
    focusBarcodeInput();
  }

  function renderClientsTable() {
    const search = normalizeText(els.clientsSearch.value);

    const clients = state.clients.filter(client => {
      if (!search) {
        return true;
      }

      return normalizeText([
        client.nome,
        client.telefone,
        client.email
      ].join(' ')).includes(search);
    });

    if (!clients.length) {
      els.clientsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum cliente encontrado.</td></tr>';
      return;
    }

    els.clientsTableBody.innerHTML = clients.map(client => {
      const openOrder = findOpenOrderForClient(client.id);
      const accountBadge = openOrder
        ? `<span class="status-badge status-warning">Conta aberta • ${formatCurrency(openOrder.total)}</span>`
        : '';

      return `
      <tr class="clickable-row" data-open-client-account="${client.id}" title="Clique para abrir a conta">
        <td>
          <span class="client-name">${escapeHtml(client.nome)}</span>
          <span class="client-id">${escapeHtml(client.id)}</span>
          ${accountBadge}
        </td>
        <td>${escapeHtml(client.telefone || '--')}</td>
        <td>${escapeHtml(client.email || '--')}</td>
        <td>${escapeHtml(client.observacao || '--')}</td>
        <td>${formatDateTime(client.criadoEm)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-primary btn-small" type="button" data-open-client-account="${client.id}">Abrir conta</button>
            <button class="btn btn-secondary btn-small" type="button" data-edit-client="${client.id}">Editar</button>
            <button class="btn btn-danger btn-small" type="button" data-archive-client="${client.id}">Arquivar</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  }

  function openClientModal(client = null) {
    els.clientForm.reset();

    if (client) {
      els.clientModalTitle.textContent = 'Editar cliente';
      els.clientId.value = client.id;
      els.clientName.value = client.nome;
      els.clientPhone.value = client.telefone || '';
      els.clientEmail.value = client.email || '';
      els.clientObservation.value = client.observacao || '';
    } else {
      els.clientModalTitle.textContent = 'Novo cliente';
      els.clientId.value = '';
    }

    els.clientModal.classList.remove('hidden');
    els.clientName.focus();
  }

  function closeClientModal() {
    els.clientModal.classList.add('hidden');
    focusBarcodeInput();
  }

  async function handleClientSubmit(event) {
    event.preventDefault();

    try {
      const operatorPayload = getOperatorPayload();

      const client = {
        id: els.clientId.value,
        nome: els.clientName.value,
        telefone: els.clientPhone.value,
        email: els.clientEmail.value,
        observacao: els.clientObservation.value,
        ...operatorPayload
      };

      if (client.id) {
        await ReloadAPI.editarCliente(client);
        showFeedback('Cliente editado com sucesso.', 'success');
      } else {
        await ReloadAPI.adicionarCliente(client);
        showFeedback('Cliente cadastrado com sucesso.', 'success');
      }

      closeClientModal();
      await fullSync();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleClientSubmit', error);
    }
  }

  async function archiveClient(clientId) {
    const confirmed = confirm('Arquivar este cliente?');

    if (!confirmed) {
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      await ReloadAPI.arquivarCliente(clientId, operatorPayload.operadorId);

      showFeedback('Cliente arquivado.', 'success');
      await fullSync();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('archiveClient', error);
    }
  }


  // FORNECEDORES


  function renderSupplierSelect() {
    els.stockEntrySupplier.innerHTML = `
      <option value="">Sem fornecedor / avulso</option>
      ${state.suppliers.map(supplier => `
        <option value="${supplier.id}">${escapeHtml(supplier.nome)}</option>
      `).join('')}
    `;
  }

  function renderSuppliersTable() {
    const search = normalizeText(els.suppliersSearch.value);

    const suppliers = state.suppliers.filter(supplier => {
      if (!search) {
        return true;
      }

      return normalizeText([
        supplier.nome,
        supplier.cnpj,
        supplier.telefone,
        supplier.email
      ].join(' ')).includes(search);
    });

    if (!suppliers.length) {
      els.suppliersTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum fornecedor encontrado.</td></tr>';
      return;
    }

    els.suppliersTableBody.innerHTML = suppliers.map(supplier => `
      <tr>
        <td>
          <span class="client-name">${escapeHtml(supplier.nome)}</span>
          <span class="client-id">${escapeHtml(supplier.id)}</span>
        </td>
        <td>${escapeHtml(supplier.cnpj || '--')}</td>
        <td>${escapeHtml(supplier.telefone || '--')}</td>
        <td>${escapeHtml(supplier.email || '--')}</td>
        <td>${escapeHtml(supplier.observacao || '--')}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-secondary btn-small" type="button" data-edit-supplier="${supplier.id}">Editar</button>
            <button class="btn btn-danger btn-small" type="button" data-archive-supplier="${supplier.id}">Arquivar</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openSupplierModal(supplier = null) {
    els.supplierForm.reset();

    if (supplier) {
      els.supplierModalTitle.textContent = 'Editar fornecedor';
      els.supplierId.value = supplier.id;
      els.supplierName.value = supplier.nome;
      els.supplierCnpj.value = supplier.cnpj || '';
      els.supplierPhone.value = supplier.telefone || '';
      els.supplierEmail.value = supplier.email || '';
      els.supplierObservation.value = supplier.observacao || '';
    } else {
      els.supplierModalTitle.textContent = 'Novo fornecedor';
      els.supplierId.value = '';
    }

    els.supplierModal.classList.remove('hidden');
    els.supplierName.focus();
  }

  function closeSupplierModal() {
    els.supplierModal.classList.add('hidden');
    focusBarcodeInput();
  }

  async function handleSupplierSubmit(event) {
    event.preventDefault();

    try {
      const supplier = {
        id: els.supplierId.value,
        nome: els.supplierName.value,
        cnpj: els.supplierCnpj.value,
        telefone: els.supplierPhone.value,
        email: els.supplierEmail.value,
        observacao: els.supplierObservation.value
      };

      if (supplier.id) {
        await ReloadAPI.editarFornecedor(supplier);
        showFeedback('Fornecedor editado com sucesso.', 'success');
      } else {
        await ReloadAPI.adicionarFornecedor(supplier);
        showFeedback('Fornecedor cadastrado com sucesso.', 'success');
      }

      closeSupplierModal();
      await fullSync();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleSupplierSubmit', error);
    }
  }

  async function archiveSupplier(supplierId) {
    const confirmed = confirm('Arquivar este fornecedor?');

    if (!confirmed) {
      return;
    }

    try {
      await ReloadAPI.arquivarFornecedor(supplierId);

      showFeedback('Fornecedor arquivado.', 'success');
      await fullSync();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('archiveSupplier', error);
    }
  }


  // ENTRADA DE ESTOQUE


  function renderStockEntryProductSelect() {
    els.stockEntryProduct.innerHTML = state.products.map(product => `
      <option value="${product.id}">${escapeHtml(product.nome)}${product.variante ? ' • ' + escapeHtml(product.variante) : ''}${product.codigo ? ' (' + escapeHtml(product.codigo) + ')' : ''}</option>
    `).join('');
  }

  function handleAddStockEntryItem(event) {
    event.preventDefault();

    const produtoId = els.stockEntryProduct.value;
    const product = state.products.find(item => item.id === produtoId);

    if (!product) {
      showFeedback('Selecione um produto.', 'error');
      return;
    }

    const quantidade = Number(els.stockEntryQuantity.value || 0);
    const custoUnitario = parseMoneyInput(els.stockEntryCost.value);

    if (quantidade <= 0) {
      showFeedback('Informe uma quantidade válida.', 'error');
      return;
    }

    state.stockEntryItems.push({
      produtoId: product.id,
      produtoNome: product.nome,
      quantidade,
      custoUnitario
    });

    renderStockEntryItemsTable();

    els.stockEntryQuantity.value = 1;
    els.stockEntryCost.value = 0;
    els.stockEntryProduct.focus();
  }

  function renderStockEntryItemsTable() {
    if (!state.stockEntryItems.length) {
      els.stockEntryItemsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum item adicionado ainda.</td></tr>';
      els.stockEntryTotal.textContent = `Total: ${formatCurrency(0)}`;
      return;
    }

    els.stockEntryItemsTableBody.innerHTML = state.stockEntryItems.map((item, index) => `
      <tr>
        <td>${escapeHtml(item.produtoNome)}</td>
        <td>${item.quantidade}</td>
        <td>${formatCurrency(item.custoUnitario)}</td>
        <td>${formatCurrency(item.quantidade * item.custoUnitario)}</td>
        <td>
          <button class="btn btn-danger btn-small" type="button" data-remove-stock-entry-item="${index}">Remover</button>
        </td>
      </tr>
    `).join('');

    const total = state.stockEntryItems.reduce((sum, item) => sum + item.quantidade * item.custoUnitario, 0);
    els.stockEntryTotal.textContent = `Total: ${formatCurrency(total)}`;
  }

  function removeStockEntryItem(index) {
    state.stockEntryItems.splice(Number(index), 1);
    renderStockEntryItemsTable();
  }

  async function handleRegisterStockEntry() {
    if (!state.stockEntryItems.length) {
      showFeedback('Adicione ao menos um item antes de registrar a entrada.', 'error');
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();
      const supplierId = els.stockEntrySupplier.value;
      const supplier = state.suppliers.find(item => item.id === supplierId);

      await ReloadAPI.registrarEntradaEstoque({
        supplierId: supplierId || '',
        supplierNome: supplier ? supplier.nome : '',
        numeroNota: els.stockEntryInvoice.value,
        observacao: els.stockEntryObservation.value,
        operadorNome: operatorPayload.operadorNome,
        itens: state.stockEntryItems
      });

      showFeedback('Entrada de estoque registrada com sucesso.', 'success');

      state.stockEntryItems = [];
      renderStockEntryItemsTable();
      els.stockEntryInvoice.value = '';
      els.stockEntryObservation.value = '';
      els.stockEntrySupplier.value = '';

      await fullSync();
      await loadStockEntries();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleRegisterStockEntry', error);
    }
  }

  async function loadStockEntries() {
    try {
      const entries = await ReloadAPI.listarEntradasEstoque();
      renderStockEntriesList(entries);
    } catch (error) {
      els.stockEntriesList.innerHTML = `<div class="empty-state">Erro ao carregar entradas: ${escapeHtml(error.message)}</div>`;
      logError('loadStockEntries', error);
    }
  }

  function renderStockEntriesList(entries) {
    if (!entries.length) {
      els.stockEntriesList.innerHTML = '<div class="empty-state">Nenhuma entrada registrada ainda.</div>';
      return;
    }

    els.stockEntriesList.innerHTML = entries.map(entry => `
      <article class="order-card">
        <div class="order-card-header">
          <div>
            <strong>${escapeHtml(entry.supplierNome || 'Fornecedor avulso')}${entry.numeroNota ? ' • NF ' + escapeHtml(entry.numeroNota) : ''}</strong>
            <p>${formatDateTime(entry.dataHora)} • ${escapeHtml(entry.operadorNome || '--')}</p>
            <p>${entry.itens.map(item => `${escapeHtml(item.produtoNome)} (${item.quantidade}x ${formatCurrency(item.custoUnitario)})`).join(', ')}</p>
          </div>
        </div>

        <p>Total: <strong>${formatCurrency(entry.valorTotal)}</strong></p>
      </article>
    `).join('');
  }


  // PEDIDOS ABERTOS
  
  async function fetchOpenOrders() {
    try {
      state.openOrders = await ReloadAPI.listarPedidosAbertos();
      renderOpenOrders();
      renderClientsTable();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('fetchOpenOrders', error);
    }
  }

  function renderOpenOrders() {
    if (!state.openOrders.length) {
      els.openOrdersList.innerHTML = '<div class="empty-state">Nenhum pedido em aberto.</div>';
      return;
    }

    els.openOrdersList.innerHTML = state.openOrders.map(order => {
      const isEmpty = !order.quantidadeItens;
      const closeButton = isEmpty
        ? `<button class="btn btn-danger btn-small" type="button" data-close-empty-order="${order.id}">Fechar comanda</button>`
        : `<button class="btn btn-danger btn-small" type="button" data-cancel-open-order="${order.id}">Cancelar</button>`;

      return `
      <article class="order-card clickable-card" data-open-order="${order.id}" title="Clique para abrir no PDV">
        <div class="order-card-header">
          <div>
            <strong>${escapeHtml(order.id)} • ${escapeHtml(order.clienteNome)}</strong>
            <p>${formatDateTime(order.dataHoraAbertura)} • ${order.quantidadeItens || 0} itens</p>
            <p>Operador: ${escapeHtml(order.operadorNome || '--')}</p>
          </div>

          <span class="status-badge ${isEmpty ? 'status-neutral' : 'status-warning'}">${isEmpty ? 'Vazia' : 'Aberto'}</span>
        </div>

        <p>Total: <strong>${formatCurrency(order.total)}</strong></p>

        <div class="table-actions" style="margin-top: 12px;">
          <button class="btn btn-secondary btn-small" type="button" data-open-order="${order.id}">Abrir</button>
          ${closeButton}
        </div>
      </article>
    `;
    }).join('');
  }


  // DEVOLUÇÕES / TROCAS


  async function searchReturnOrder() {
    const pedidoId = els.returnOrderSearch.value.trim();

    if (!pedidoId) {
      showFeedback('Informe o número do pedido.', 'error');
      return;
    }

    try {
      const data = await ReloadAPI.buscarVendaParaDevolucao(pedidoId);
      renderReturnOrderResult(data);
    } catch (error) {
      els.returnOrderResult.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
      logError('searchReturnOrder', error);
    }
  }

  function renderReturnOrderResult(data) {
    const { venda, itens } = data;

    const rows = itens.map(item => {
      const restante = item.quantidade - item.quantidadeJaDevolvida;

      if (restante <= 0) {
        return `
          <div class="order-item">
            <div>
              <span class="order-item-title">${escapeHtml(item.produtoNome)}</span>
              <span class="order-item-meta">Vendido: ${item.quantidade} • já devolvido integralmente</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="order-item">
          <div>
            <span class="order-item-title">${escapeHtml(item.produtoNome)}</span>
            <span class="order-item-meta">Vendido: ${item.quantidade} x ${formatCurrency(item.valorUnitario)} • restam ${restante} p/ devolver</span>

            <div class="order-item-actions" style="flex-wrap: wrap; gap: 8px;">
              <input id="return-qty-${item.itemId}" type="number" min="1" max="${restante}" value="1" style="width: 70px;" />
              <select id="return-tipo-${item.itemId}">
                <option value="devolucao">Devolução (estorna)</option>
                <option value="troca">Troca (sem estorno)</option>
              </select>
              <input id="return-motivo-${item.itemId}" type="text" placeholder="Motivo (opcional)" style="width: 160px;" />
              <button class="btn btn-primary btn-small" type="button" data-confirm-return="${item.itemId}" data-return-pedido="${venda.pedidoId}">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    els.returnOrderResult.innerHTML = `
      <article class="order-card">
        <div class="order-card-header">
          <div>
            <strong>${escapeHtml(venda.pedidoId)} • ${escapeHtml(venda.clienteNome)}</strong>
            <p>${formatDateTime(venda.dataHora)} • Total da venda: ${formatCurrency(venda.total)}</p>
          </div>
        </div>
      </article>
      ${rows}
    `;
  }

  async function confirmReturn(pedidoId, itemId) {
    const qtyInput = document.getElementById(`return-qty-${itemId}`);
    const tipoInput = document.getElementById(`return-tipo-${itemId}`);
    const motivoInput = document.getElementById(`return-motivo-${itemId}`);

    const quantidade = Number(qtyInput.value || 0);
    const tipo = tipoInput.value;
    const motivo = motivoInput.value;

    if (quantidade <= 0) {
      showFeedback('Informe uma quantidade válida.', 'error');
      return;
    }

    const adminPin = await requestAdminPin({
      title: tipo === 'devolucao' ? 'Confirmar devolução' : 'Confirmar troca',
      description: 'Informe o PIN de administrador para confirmar.'
    });

    if (!adminPin) {
      showFeedback('Operação abortada.', 'info');
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      await ReloadAPI.registrarDevolucao({
        pedidoId,
        itemId,
        quantidade,
        tipo,
        motivo,
        adminPin,
        operadorNome: operatorPayload.operadorNome
      });

      showFeedback(tipo === 'devolucao' ? 'Devolução registrada.' : 'Troca registrada.', 'success');

      await searchReturnOrder();
      await loadRecentReturns();
      await lightSync();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('confirmReturn', error);
    }
  }

  async function loadRecentReturns() {
    try {
      const devolucoes = await ReloadAPI.listarDevolucoes(getTodayInputValue());
      renderReturnsList(devolucoes);
    } catch (error) {
      els.returnsList.innerHTML = `<div class="empty-state">Erro ao carregar devoluções: ${escapeHtml(error.message)}</div>`;
      logError('loadRecentReturns', error);
    }
  }

  function renderReturnsList(devolucoes) {
    if (!devolucoes.length) {
      els.returnsList.innerHTML = '<div class="empty-state">Nenhuma devolução registrada hoje.</div>';
      return;
    }

    const labels = { devolucao: 'Devolução', troca: 'Troca' };

    els.returnsList.innerHTML = devolucoes.map(dev => `
      <article class="log-card">
        <div class="log-card-header">
          <div>
            <strong>${escapeHtml(labels[dev.tipo] || dev.tipo)} • ${escapeHtml(dev.produtoNome)} • ${dev.quantidade}x</strong>
            <p>${formatDateTime(dev.dataHora)} • Pedido ${escapeHtml(dev.pedidoId)} • ${escapeHtml(dev.operadorNome || '--')}</p>
          </div>

          <span class="status-badge ${dev.tipo === 'devolucao' ? 'status-error' : 'status-warning'}">
            ${dev.tipo === 'devolucao' ? formatCurrency(dev.valorDevolvido) : 'Sem estorno'}
          </span>
        </div>

        <p>${escapeHtml(dev.motivo || 'Sem motivo informado.')}</p>
      </article>
    `).join('');
  }

  
  // CAIXA
  

  async function fetchCashDay() {
    try {
      state.cashDay = await ReloadAPI.obterCaixaDia(getTodayInputValue());
      renderCashStatus();
      renderCashSummary();
      renderCashMovements();
      prefillCashClosingFields();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('fetchCashDay', error);
    }
  }

  function prefillCashClosingFields() {
    const resumo = state.cashDay?.movimentosResumo;

    if (!resumo) {
      return;
    }

    els.cashWithdrawals.value = resumo.sangria;
    els.cashExpenses.value = resumo.despesa;
  }

  async function handleRegisterCashMovement(event) {
    event.preventDefault();

    const tipo = els.cashMovementType.value;
    const valor = parseMoneyInput(els.cashMovementValue.value);

    if (valor <= 0) {
      showFeedback('Informe um valor maior que zero.', 'error');
      return;
    }

    let adminPin = '';

    if (tipo === 'sangria') {
      adminPin = await requestAdminPin({
        title: 'Registrar sangria',
        description: 'Informe o PIN de administrador para registrar a retirada de dinheiro do caixa.'
      });

      if (!adminPin) {
        showFeedback('Sangria abortada.', 'info');
        return;
      }
    }

    try {
      const operatorPayload = getOperatorPayload();

      await ReloadAPI.registrarMovimentoCaixa({
        data: getTodayInputValue(),
        tipo,
        valor,
        motivo: els.cashMovementReason.value,
        adminPin,
        operadorNome: operatorPayload.operadorNome
      });

      showFeedback('Movimentação registrada.', 'success');
      els.cashMovementForm.reset();
      await fetchCashDay();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleRegisterCashMovement', error);
    }
  }

  function renderCashMovements() {
    const movimentos = state.cashDay?.movimentos || [];

    if (!movimentos.length) {
      els.cashMovementsList.innerHTML = '<div class="empty-state">Nenhuma movimentação registrada hoje.</div>';
      return;
    }

    const labels = { sangria: 'Sangria', suprimento: 'Suprimento', despesa: 'Despesa' };
    const badgeClass = { sangria: 'status-error', suprimento: 'status-ok', despesa: 'status-warning' };

    els.cashMovementsList.innerHTML = movimentos.map(mov => `
      <article class="log-card">
        <div class="log-card-header">
          <div>
            <strong>${escapeHtml(labels[mov.tipo] || mov.tipo)} • ${formatCurrency(mov.valor)}</strong>
            <p>${formatDateTime(mov.dataHora)} • ${escapeHtml(mov.operadorNome || '--')}</p>
          </div>

          <span class="status-badge ${badgeClass[mov.tipo] || 'status-gray'}">${escapeHtml(labels[mov.tipo] || mov.tipo)}</span>
        </div>

        <p>${escapeHtml(mov.motivo || 'Sem motivo informado.')}</p>
      </article>
    `).join('');
  }

  async function handleOpenCash(event) {
    event.preventDefault();

    try {
      const operatorPayload = getOperatorPayload();

      await ReloadAPI.abrirCaixa({
        data: els.cashOpenDate.value,
        saldoInicial: els.cashInitialBalance.value,
        observacao: els.cashOpenObservation.value,
        ...operatorPayload
      });

      showFeedback('Caixa aberto com sucesso.', 'success');
      await fetchCashDay();
      switchView('pdv');
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleOpenCash', error);
    }
  }

  async function handleCloseCash(event) {
    event.preventDefault();

    const confirmed = confirm('Confirmar fechamento do caixa?');

    if (!confirmed) {
      return;
    }

    const adminPin = await requestAdminPin({
      title: 'Fechar caixa',
      description: 'Informe o PIN de administrador para fechar o caixa.'
    });

    if (!adminPin) {
      showFeedback('Fechamento de caixa abortado.', 'info');
      return;
    }

    try {
      const result = await ReloadAPI.fecharCaixa({
        data: els.cashCloseDate.value,
        sangrias: els.cashWithdrawals.value,
        despesas: els.cashExpenses.value,
        saldoInformado: els.cashReportedBalance.value,
        observacao: els.cashCloseObservation.value,
        adminPin
      });

      showFeedback(`Caixa fechado. Diferença: ${formatCurrency(result.caixa.diferenca)}.`, 'success');
      await fetchCashDay();
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('handleCloseCash', error);
    }
  }

  function renderCashStatus() {
    if (!state.cashDay || !state.cashDay.caixa) {
      els.cashStatus.textContent = 'Fechado';
      els.cashStatus.className = 'status-pill status-closed';
      return;
    }

    const status = state.cashDay.caixa.status;

    if (status === 'aberto') {
      els.cashStatus.textContent = 'Aberto';
      els.cashStatus.className = 'status-pill status-open';
    } else {
      els.cashStatus.textContent = 'Fechado';
      els.cashStatus.className = 'status-pill status-closed';
    }
  }

  function renderCashSummary() {
    const resumo = state.cashDay?.resumoVendas;

    if (!resumo) {
      els.cashMoney.textContent = formatCurrency(0);
      els.cashPix.textContent = formatCurrency(0);
      els.cashDebit.textContent = formatCurrency(0);
      els.cashCredit.textContent = formatCurrency(0);
      els.cashOther.textContent = formatCurrency(0);
      els.cashSalesTotal.textContent = formatCurrency(0);
      return;
    }

    els.cashMoney.textContent = formatCurrency(resumo.formas.dinheiro);
    els.cashPix.textContent = formatCurrency(resumo.formas.pix);
    els.cashDebit.textContent = formatCurrency(resumo.formas.debito);
    els.cashCredit.textContent = formatCurrency(resumo.formas.credito);
    els.cashOther.textContent = formatCurrency(resumo.formas.outros);
    els.cashSalesTotal.textContent = formatCurrency(resumo.totalVendas);
  }

  function isCashOpen() {
    return Boolean(state.cashDay && state.cashDay.caixaAberto === true);
  }


  // RELATÓRIOS / PDF


  async function loadDailyReport() {
    try {
      const report = await ReloadAPI.relatorioDiario(els.dailyReportDate.value);
      renderReport(report);
      showFeedback('Relatório diário carregado.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('loadDailyReport', error);
    }
  }

  async function loadMonthlyReport() {
    try {
      const [year, month] = els.monthlyReportInput.value.split('-');
      const report = await ReloadAPI.relatorioMensal(year, month);

      renderReport(report);
      showFeedback('Relatório mensal carregado.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('loadMonthlyReport', error);
    }
  }

  async function loadAnnualReport() {
    try {
      const report = await ReloadAPI.relatorioAnual(els.annualReportYear.value);

      renderReport(report);
      showFeedback('Relatório anual / DAS carregado.', 'success');
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('loadAnnualReport', error);
    }
  }

  async function generateMonthlyPdf() {
    try {
      const operatorPayload = getOperatorPayload();
      const [ano, mes] = els.monthlyReportInput.value.split('-');

      if (!ano || !mes) {
        throw new Error('Selecione o mês do relatório.');
      }

      setButtonLoading(els.btnPdfMonthly, true, 'Gerando PDF...');

      const result = await ReloadAPI.gerarPdfMensal({
        ano,
        mes,
        ...operatorPayload
      });

      showFeedback('PDF mensal gerado com sucesso.', 'success');
      openExternalUrl(result.url);

      await loadPdfReports(false);
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('generateMonthlyPdf', error);
    } finally {
      setButtonLoading(els.btnPdfMonthly, false, 'Baixar PDF mensal contabilidade');
    }
  }

  async function generateDailyPdf() {
    try {
      const operatorPayload = getOperatorPayload();
      const data = els.cashCloseDate.value || getTodayInputValue();

      setButtonLoading(els.btnPdfDaily, true, 'Gerando PDF...');

      const result = await ReloadAPI.gerarPdfFechamentoDiario({
        data,
        ...operatorPayload
      });

      showFeedback('PDF de fechamento diário gerado com sucesso.', 'success');
      openExternalUrl(result.url);

      await loadPdfReports(false);
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('generateDailyPdf', error);
    } finally {
      setButtonLoading(els.btnPdfDaily, false, 'Baixar PDF fechamento diário');
    }
  }

  async function loadPdfReports(showMessage = true) {
    try {
      const reports = await ReloadAPI.listarRelatoriosPDF();
      renderPdfReports(reports);

      if (showMessage) {
        showFeedback('Lista de PDFs atualizada.', 'success');
      }
    } catch (error) {
      els.pdfReportsList.innerHTML = `<div class="empty-state">Erro ao carregar PDFs: ${escapeHtml(error.message)}</div>`;
      logError('loadPdfReports', error);
    }
  }

  function renderPdfReports(reports) {
    if (!reports.length) {
      els.pdfReportsList.innerHTML = '<div class="empty-state">Nenhum PDF gerado ainda.</div>';
      return;
    }

    els.pdfReportsList.innerHTML = reports.map(report => `
      <article class="pdf-card">
        <div class="pdf-card-header">
          <div>
            <strong>${escapeHtml(report.arquivoNome)}</strong>
            <p>${formatDateTime(report.dataHora)} • ${escapeHtml(report.tipo)} • período ${escapeHtml(report.periodo)}</p>
            <p>Gerado por: ${escapeHtml(report.geradoPor || '--')}</p>
          </div>

          <span class="status-badge ${report.status === 'OK' ? 'status-ok' : 'status-error'}">${escapeHtml(report.status)}</span>
        </div>

        <div class="card-actions">
          <a class="btn btn-secondary btn-small" href="${escapeAttribute(report.url)}" target="_blank" rel="noopener">
            Abrir PDF
          </a>
        </div>
      </article>
    `).join('');
  }

  function renderReport(report) {
    els.reportRevenue.textContent = formatCurrency(report.totalVendido || 0);
    els.reportCost.textContent = formatCurrency(report.custoTotal || 0);
    els.reportProfit.textContent = formatCurrency(report.lucroBruto || 0);
    els.reportAverageTicket.textContent = formatCurrency(report.ticketMedio || 0);
    els.reportDas.textContent = formatCurrency(report.das?.dasEstimado || 0);

    renderPaymentChart(report.formasPagamento || {});
    renderSalesReportTable(report.vendas || []);
  }

  function renderPaymentChart(forms) {
    const labels = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Outros'];
    const values = [
      forms.dinheiro || 0,
      forms.pix || 0,
      forms.debito || 0,
      forms.credito || 0,
      forms.outros || 0
    ];

    if (state.paymentChart) {
      state.paymentChart.destroy();
    }

    state.paymentChart = new Chart(els.paymentChart, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              'rgba(132, 204, 22, 0.75)',
              'rgba(163, 230, 53, 0.75)',
              'rgba(210, 153, 34, 0.75)',
              'rgba(20, 122, 88, 0.75)',
              'rgba(139, 148, 158, 0.75)'
            ],
            borderColor: '#161b22',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#f0f6fc'
            }
          }
        }
      }
    });
  }

  function renderSalesReportTable(vendas) {
    if (!vendas.length) {
      els.salesReportTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma venda encontrada.</td></tr>';
      return;
    }

    els.salesReportTableBody.innerHTML = vendas.map(venda => `
      <tr>
        <td>${formatDateTime(venda.dataHora)}</td>
        <td>${escapeHtml(venda.pedidoId)}</td>
        <td>${escapeHtml(venda.clienteNome)}</td>
        <td>${escapeHtml(venda.operadorNome || '--')}</td>
        <td>${formatPaymentMethod(venda.formaPagamento)}</td>
        <td>${formatCurrency(venda.total)}</td>
        <td>${formatCurrency(venda.custoTotal)}</td>
        <td>${formatCurrency(venda.lucroBruto)}</td>
      </tr>
    `).join('');
  }

  
  // DIAGNÓSTICO / LOGS / BACKUP 
 

  async function runHealthCheck(showSuccessMessage) {
    try {
      const health = await ReloadAPI.health();

      els.healthResult.innerHTML = `
        <article class="health-card">
          <div class="health-card-header">
            <div>
              <strong>Status geral: ${escapeHtml(health.status)}</strong>
              <p>${escapeHtml(health.empresaNome)} • versão ${escapeHtml(health.versaoSistema)}</p>
            </div>

            <span class="status-badge ${health.status === 'OK' ? 'status-ok' : 'status-warning'}">${escapeHtml(health.status)}</span>
          </div>

          <p>Token configurado: ${health.apiTokenConfigurado ? 'Sim' : 'Não'}</p>
          <p>Login obrigatório: ${health.exigirLogin ? 'Sim' : 'Não'}</p>
          <p>Token obrigatório: ${health.exigirApiToken ? 'Sim' : 'Não'}</p>
          <p>Estoque negativo: ${health.alertas.estoqueNegativo}</p>
          <p>Produtos sem preço: ${health.alertas.produtosSemPreco}</p>
          <p>Produtos zerados: ${health.alertas.produtosZerados}</p>
          <p>Caixa hoje aberto: ${health.alertas.caixaHojeAberto ? 'Sim' : 'Não'}</p>
        </article>

        ${health.checks.map(check => `
          <article class="health-card">
            <div class="health-card-header">
              <strong>${escapeHtml(check.sheet)}</strong>
              <span class="status-badge ${check.status === 'OK' ? 'status-ok' : 'status-error'}">${escapeHtml(check.status)}</span>
            </div>
            <p>${escapeHtml(check.mensagem)}</p>
          </article>
        `).join('')}
      `;

      if (showSuccessMessage) {
        showFeedback('Diagnóstico executado.', 'success');
      }
    } catch (error) {
      els.healthResult.innerHTML = `<div class="empty-state">Erro no diagnóstico: ${escapeHtml(error.message)}</div>`;
      showFeedback(error.message, 'error');
      logError('runHealthCheck', error);
    }
  }

  async function loadLogs() {
    try {
      const logs = await ReloadAPI.listarLogs();

      if (!logs.length) {
        els.logsList.innerHTML = '<div class="empty-state">Nenhum log encontrado.</div>';
        return;
      }

      els.logsList.innerHTML = logs.map(log => `
        <article class="log-card">
          <div class="log-card-header">
            <div>
              <strong>${escapeHtml(log.nivel)} • ${escapeHtml(log.acao)}</strong>
              <p>${formatDateTime(log.dataHora)} • ${escapeHtml(log.origem)} • ${escapeHtml(log.usuario || '--')}</p>
            </div>

            <span class="status-badge ${getLogStatusClass(log.nivel)}">${escapeHtml(log.nivel)}</span>
          </div>

          <p>${escapeHtml(log.mensagem)}</p>
        </article>
      `).join('');
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('loadLogs', error);
    }
  }

  async function runManualBackup() {
    const confirmed = confirm('Gerar backup manual da planilha agora?');

    if (!confirmed) {
      return;
    }

    try {
      const operatorPayload = getOperatorPayload();

      setButtonLoading(els.btnBackupManual, true, 'Gerando backup...');

      const backup = await ReloadAPI.backupManual({
        ...operatorPayload,
        criadoPor: operatorPayload.operadorNome
      });

      showFeedback('Backup manual gerado com sucesso.', 'success');
      openExternalUrl(backup.url);

      await loadBackups(false);
    } catch (error) {
      showFeedback(error.message, 'error');
      logError('runManualBackup', error);
    } finally {
      setButtonLoading(els.btnBackupManual, false, 'Fazer backup manual');
    }
  }

  async function loadBackups(showMessage = true) {
    try {
      const backups = await ReloadAPI.listarBackups();
      renderBackups(backups);

      if (showMessage) {
        showFeedback('Lista de backups atualizada.', 'success');
      }
    } catch (error) {
      els.backupsList.innerHTML = `<div class="empty-state">Erro ao carregar backups: ${escapeHtml(error.message)}</div>`;
      logError('loadBackups', error);
    }
  }

  function renderBackups(backups) {
    if (!backups.length) {
      els.backupsList.innerHTML = '<div class="empty-state">Nenhum backup gerado ainda.</div>';
      return;
    }

    els.backupsList.innerHTML = backups.map(backup => `
      <article class="backup-card">
        <div class="backup-card-header">
          <div>
            <strong>${escapeHtml(backup.arquivoNome)}</strong>
            <p>${formatDateTime(backup.dataHora)} • criado por ${escapeHtml(backup.criadoPor || '--')}</p>
            <p>${escapeHtml(backup.mensagem || '')}</p>
          </div>

          <span class="status-badge ${backup.status === 'OK' ? 'status-ok' : 'status-error'}">${escapeHtml(backup.status)}</span>
        </div>

        <div class="card-actions">
          <a class="btn btn-secondary btn-small" href="${escapeAttribute(backup.url)}" target="_blank" rel="noopener">
            Abrir backup
          </a>
        </div>
      </article>
    `).join('');
  }

  // =============================
  // CLIQUES DINÂMICOS - para deixar easy
  // =============================

  function handleDynamicClicks(event) {
    const addProductButton = event.target.closest('[data-add-product]');
    if (addProductButton) {
      addProductToCurrentOrder(addProductButton.dataset.addProduct);
      return;
    }

    const removeOrderItemButton = event.target.closest('[data-remove-order-item]');
    if (removeOrderItemButton) {
      removeOrderItem(removeOrderItemButton.dataset.removeOrderItem);
      return;
    }

    const discountOrderItemButton = event.target.closest('[data-discount-order-item]');
    if (discountOrderItemButton) {
      promptItemDiscount(
        discountOrderItemButton.dataset.discountOrderItem,
        discountOrderItemButton.dataset.currentDiscount
      );
      return;
    }

    const editProductButton = event.target.closest('[data-edit-product]');
    if (editProductButton) {
      const product = state.products.find(item => item.id === editProductButton.dataset.editProduct);
      openProductModal(product);
      return;
    }

    const archiveProductButton = event.target.closest('[data-archive-product]');
    if (archiveProductButton) {
      archiveProduct(archiveProductButton.dataset.archiveProduct);
      return;
    }

    const editClientButton = event.target.closest('[data-edit-client]');
    if (editClientButton) {
      const client = state.clients.find(item => item.id === editClientButton.dataset.editClient);
      openClientModal(client);
      return;
    }

    const archiveClientButton = event.target.closest('[data-archive-client]');
    if (archiveClientButton) {
      archiveClient(archiveClientButton.dataset.archiveClient);
      return;
    }

    const clientAccountRow = event.target.closest('[data-open-client-account]');
    if (clientAccountRow) {
      openClientAccount(clientAccountRow.dataset.openClientAccount);
      return;
    }

    const editSupplierButton = event.target.closest('[data-edit-supplier]');
    if (editSupplierButton) {
      const supplier = state.suppliers.find(item => item.id === editSupplierButton.dataset.editSupplier);
      openSupplierModal(supplier);
      return;
    }

    const archiveSupplierButton = event.target.closest('[data-archive-supplier]');
    if (archiveSupplierButton) {
      archiveSupplier(archiveSupplierButton.dataset.archiveSupplier);
      return;
    }

    const removeStockEntryItemButton = event.target.closest('[data-remove-stock-entry-item]');
    if (removeStockEntryItemButton) {
      removeStockEntryItem(removeStockEntryItemButton.dataset.removeStockEntryItem);
      return;
    }

    const closeEmptyOrderButton = event.target.closest('[data-close-empty-order]');
    if (closeEmptyOrderButton) {
      closeEmptyOrder(closeEmptyOrderButton.dataset.closeEmptyOrder);
      return;
    }

    const cancelOpenOrderButton = event.target.closest('[data-cancel-open-order]');
    if (cancelOpenOrderButton) {
      cancelOpenOrder(cancelOpenOrderButton.dataset.cancelOpenOrder);
      return;
    }

    const openOrderButton = event.target.closest('[data-open-order]');
    if (openOrderButton) {
      openExistingOrder(openOrderButton.dataset.openOrder);
      return;
    }

    const confirmReturnButton = event.target.closest('[data-confirm-return]');
    if (confirmReturnButton) {
      confirmReturn(confirmReturnButton.dataset.returnPedido, confirmReturnButton.dataset.confirmReturn);
    }
  }

  // =============================
  // Serventes de pedreiros
  // =============================

  function getCategories() {
    const fromProducts = state.products
      .map(product => product.categoria)
      .filter(Boolean);

    return Array.from(new Set([...CONFIG.DEFAULT_CATEGORIES, ...fromProducts])).sort();
  }

  function getProductStatus(product) {
    if (product.quantidade === 0) {
      return {
        label: CONFIG.OUT_OF_STOCK_LABEL,
        className: 'status-error'
      };
    }

    if (product.quantidade <= product.minimo) {
      return {
        label: CONFIG.LOW_STOCK_LABEL,
        className: 'status-warning'
      };
    }

    return {
      label: CONFIG.NORMAL_STOCK_LABEL,
      className: 'status-ok'
    };
  }

  function groupBy(items, key) {
    return items.reduce((acc, item) => {
      const group = item[key] || 'Sem categoria';

      if (!acc[group]) {
        acc[group] = [];
      }

      acc[group].push(item);

      return acc;
    }, {});
  }

  function setConnectionStatus(status, text) {
    els.connectionStatus.textContent = text;
    els.connectionStatus.className = `status-pill status-${status}`;
  }

  function updateLastSync() {
    els.lastSync.textContent = new Date().toLocaleString(CONFIG.DATE_LOCALE);
  }

  function showFeedback(message, type = 'info') {
    els.feedbackMessage.textContent = message;
    els.feedbackMessage.className = `feedback ${type}`;

    clearTimeout(showFeedback.timer);

    showFeedback.timer = setTimeout(() => {
      els.feedbackMessage.classList.add('hidden');
    }, 5000);
  }

  function setButtonLoading(button, loading, text) {
    if (!button) {
      return;
    }

    button.disabled = loading;
    button.textContent = text;
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString(CONFIG.CURRENCY_LOCALE, {
      style: 'currency',
      currency: CONFIG.CURRENCY_CODE
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return '--';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '--';
    }

    return date.toLocaleString(CONFIG.DATE_LOCALE);
  }

  function formatPaymentMethod(value) {
    const method = CONFIG.PAYMENT_METHODS.find(item => item.value === value);

    return method ? method.label : value;
  }

  function getTodayInputValue() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);

    return local.toISOString().slice(0, 10);
  }

  function parseMoneyInput(value) {
    const number = Number(String(value || '0').replace(',', '.'));

    if (Number.isNaN(number)) {
      return 0;
    }

    return Math.max(0, Number(number.toFixed(2)));
  }

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('`', '&#096;');
  }

  function getLogStatusClass(level) {
    const normalized = String(level || '').toUpperCase();

    if (normalized === 'ERROR' || normalized === 'CRITICAL') {
      return 'status-error';
    }

    if (normalized === 'WARN') {
      return 'status-warning';
    }

    return 'status-gray';
  }

  function generateRequestId(prefix = 'REQ') {
    if (window.crypto && window.crypto.randomUUID) {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function openExternalUrl(url) {
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  function installGlobalErrorHandlers() {
    if (!CONFIG.LOG_FRONTEND_ERRORS) {
      return;
    }

    window.addEventListener('error', event => {
      logError('window.error', {
        message: event.message,
        stack: `${event.filename}:${event.lineno}:${event.colno}`
      });
    });

    window.addEventListener('unhandledrejection', event => {
      const reason = event.reason || {};

      logError('unhandledrejection', {
        message: reason.message || String(reason),
        stack: reason.stack || ''
      });
    });
  }

  async function logError(action, error) {
    try {
      await ReloadAPI.registrarLog({
        nivel: 'ERROR',
        origem: 'frontend',
        acao: action,
        mensagem: error.message || String(error),
        detalhes: error.stack || '',
        usuario: state.currentOperator?.nome || 'sem login'
      });
    } catch (logErrorResponse) {
      console.warn('Erro ao registrar log:', logErrorResponse);
    }
  }

  return {
    fullSync,
    lightSync
  };
})();
