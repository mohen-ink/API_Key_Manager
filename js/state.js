var STORAGE_KEY = "apikey_vault_records_v4";
var THEME_KEY = "apikey_vault_theme_v4";
var PROXY_KEY = "apikey_vault_proxy_url_v4";
var MODEL_COLLAPSE_LIMIT = 8;

var providerMap = {
  openai: {
    label: "OpenAI",
    defaultBaseUrl: ""
  },
  google: {
    label: "Google Gemini",
    defaultBaseUrl: ""
  },
  claude: {
    label: "Claude / Anthropic",
    defaultBaseUrl: ""
  },
  custom: {
    label: "自定义 OpenAI 兼容",
    defaultBaseUrl: ""
  }
};

var AppState = {
  records: [],
  editModels: [],
  expandedModels: {},
  toastTimer: null,
  els: {}
};