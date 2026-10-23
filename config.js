const CONFIG = {
  APP_NAME: 'Reload PDV',
  EMPRESA_ID: 'reload',
  EMPRESA_NOME: 'Reload',
  SYSTEM_VERSION: '1.2.0',

    API_URL: `${window.location.protocol}//${window.location.hostname}:3100/exec`,

  CURRENCY_LOCALE: 'pt-BR',
  CURRENCY_CODE: 'BRL',
  DATE_LOCALE: 'pt-BR',
  AUTO_SYNC_ENABLED: true,
  AUTO_SYNC_INTERVAL_MS: 60000,

  FULL_SYNC_AFTER_SALE: true,

  REQUIRE_LOGIN: true,
  REQUIRE_OPEN_CASH_TO_SELL: true,
  PREVENT_DOUBLE_SUBMIT: true,

  REQUIRE_ADMIN_TO_CANCEL_ORDER: true,
  REQUIRE_ADMIN_TO_CLOSE_CASH: true,

  DEFAULT_CLIENT_NAME: 'Consumidor Final',
  DEFAULT_PAYMENT_METHOD: 'dinheiro',

  STORAGE_KEYS: {
    OPERATOR: 'reload_operator',
    CURRENT_ORDER_ID: 'reload_current_order_id'
  },

  PAYMENT_METHODS: [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'pix', label: 'Pix' },
    { value: 'debito', label: 'Débito' },
    { value: 'credito', label: 'Crédito' },
    { value: 'outros', label: 'Outros' }
  ],

  DEFAULT_CATEGORIES: [
    'Bebidas',
    'Salgados',
    'Doces',
    'Bomboniere',
    'Higiene',
    'Mercearia',
    'Outros'
  ],

  LOW_STOCK_LABEL: 'Estoque baixo',
  OUT_OF_STOCK_LABEL: 'Zerado',
  NORMAL_STOCK_LABEL: 'Normal',

  DEFAULT_DAS_PERCENT: 4,

  LOG_FRONTEND_ERRORS: true,
  HEALTH_CHECK_ON_START: true
};