function cacheElements() {
  [
    "themeBtn",
    "proxySettingBtn",
    "modelTestBtn",
    "importBtn",
    "exportBtn",
    "webdavBtn",
    "addBtn",
    "searchInput",
    "cardsContainer",
    "totalConfig",
    "totalKeys",
    "totalModels",
    "proxyStatus",

    "editorModal",
    "editorTitle",
    "closeEditorBtn",
    "cancelEditorBtn",
    "saveConfigBtn",
    "editingId",
    "nameInput",
    "providerInput",
    "baseUrlInput",
    "copyBaseInEditorBtn",
    "keyRows",
    "addKeyBtn",
    "modelInput",
    "addModelBtn",
    "clearEditModelsBtn",
    "modelEditList",
    "fetchModelsInEditorBtn",
    "editorStatus",

    "proxyModal",
    "closeProxyBtn",
    "proxyUrlInput",
    "proxySettingStatus",
    "testProxyBtn",
    "clearProxyBtn",
    "saveProxyBtn",

    "testModal",
    "closeTestBtn",
    "closeTestFooterBtn",
    "testKeySelect",
    "testModelSelect",
    "testPromptInput",
    "proxyChatTestBtn",
    "browserChatTestBtn",
    "testResultBox",

    "importModal",
    "closeImportBtn",
    "cancelImportBtn",
    "confirmImportBtn",
    "readClipboardBtn",
    "importTextarea",

    "webdavModal",
    "closeWebdavBtn",
    "webdavUrlInput",
    "webdavUsernameInput",
    "webdavPasswordInput",
    "webdavPathInput",
    "saveWebdavBtn",
    "testWebdavBtn",
    "webdavBackupBtn",
    "webdavRestoreBtn",
    "webdavFileSelect",
    "webdavRefreshBtn",
    "webdavStatus",

    "toast"
  ].forEach(function (id) {
    AppState.els[id] = $(id);
  });
}

function renderAll() {
  renderStats();
  renderCards();
}

function renderStats() {
  var records = AppState.records;

  AppState.els.totalConfig.textContent = records.length;

  AppState.els.totalKeys.textContent = records.reduce(function (sum, item) {
    return sum + normalizeKeys(item.keys).length;
  }, 0);

  AppState.els.totalModels.textContent = records.reduce(function (sum, item) {
    return sum + uniqueArray(item.models).length;
  }, 0);
}

function renderCards() {
  var keyword = AppState.els.searchInput.value.trim().toLowerCase();

  var filtered = AppState.records.filter(function (item) {
    var name = String(item.name || "").toLowerCase();
    var baseUrl = String(item.baseUrl || "").toLowerCase();
    var provider = getProviderLabel(item.provider).toLowerCase();
    var models = uniqueArray(item.models || []);

    return (
      name.indexOf(keyword) !== -1 ||
      baseUrl.indexOf(keyword) !== -1 ||
      provider.indexOf(keyword) !== -1 ||
      models.some(function (m) {
        return m.toLowerCase().indexOf(keyword) !== -1;
      })
    );
  });

  if (!filtered.length) {
    AppState.els.cardsContainer.innerHTML =
      '<div class="empty-state">' +
      '<strong>暂无配置</strong>' +
      '<span>点击「新增配置」添加 API Key</span>' +
      '</div>';
    return;
  }

  AppState.els.cardsContainer.innerHTML = filtered.map(function (item) {
    return renderCard(item);
  }).join("");
}

function renderCard(item) {
  var keys = normalizeKeys(item.keys);
  var models = uniqueArray(item.models || []);
  var providerLabel = getProviderLabel(item.provider);

  var toggleButton = "";

  if (models.length > MODEL_COLLAPSE_LIMIT) {
    toggleButton =
      '<button class="copy-mini-btn" data-action="toggle-models" type="button">' +
      (AppState.expandedModels[item.id] ? "收起" : "展开") +
      '</button>';
  }

  var clearButton = "";

  if (models.length) {
    clearButton =
      '<button class="danger-btn small-btn" data-action="clear-models" type="button">清空</button>';
  }

  return (
    '<article class="api-card" data-id="' + escapeAttr(item.id) + '">' +
      '<div class="card-head">' +
        '<div class="card-title">' +
          '<h3>' + escapeHtml(item.name) + '</h3>' +
          '<div class="badges">' +
            '<span class="badge">' + escapeHtml(providerLabel) + '</span>' +
            '<span class="badge gray">' + keys.length + ' 个 Key</span>' +
            '<span class="badge gray">' + models.length + ' 个模型</span>' +
          '</div>' +
        '</div>' +

        '<div class="card-actions">' +
          '<button class="small-btn" data-action="edit" type="button">编辑</button>' +
          '<button class="danger-btn small-btn" data-action="delete" type="button">删除</button>' +
        '</div>' +
      '</div>' +

      '<div class="info-block">' +
        '<div class="info-title-row">' +
          '<div class="info-label">API Base URL</div>' +
          '<button class="copy-mini-btn" data-action="copy-base" type="button">复制</button>' +
        '</div>' +
        '<div class="mono-box">' + escapeHtml(item.baseUrl) + '</div>' +
      '</div>' +

      '<div class="info-block">' +
        '<div class="info-label">API Key 列表</div>' +
        '<div class="key-list">' +
          keys.map(function (key) {
            return renderKeyItem(key);
          }).join("") +
        '</div>' +
      '</div>' +

      '<div class="info-block">' +
        '<div class="info-title-row">' +
          '<div class="info-label">模型列表</div>' +
          '<div class="card-actions">' +
            toggleButton +
            clearButton +
          '</div>' +
        '</div>' +
        '<div class="models-wrap">' +
          renderModelPills(item) +
        '</div>' +
      '</div>' +

      /* ─── 2×2 网格按钮区 ─── */
      '<div class="card-bottom-actions">' +
        '<button class="small-btn" data-action="copy-all-keys" type="button">📋 复制全部 Key</button>' +
        '<button class="small-btn" data-action="copy-config" type="button">📦 复制完整配置</button>' +
        '<button class="primary-btn small-btn" data-action="fetch-models-proxy" type="button">🔗 代理获取模型</button>' +
        '<button class="small-btn" data-action="fetch-models-browser" type="button">🌐 浏览器获取模型</button>' +
      '</div>' +

      '<div class="info-label" style="margin-top:14px">' +
        '更新时间：' + escapeHtml(formatTime(item.updatedAt || item.createdAt)) +
      '</div>' +
    '</article>'
  );
}

function renderKeyItem(key) {
  return (
    '<div class="key-item">' +
      '<span class="key-name">' + escapeHtml(key.label || "Key") + '</span>' +
      '<span class="key-value">' + escapeHtml(maskKey(key.value)) + '</span>' +
      '<button class="copy-mini-btn" data-action="copy-key" data-key-id="' + escapeAttr(key.id) + '" type="button">复制</button>' +
    '</div>'
  );
}

function renderModelPills(item) {
  var models = uniqueArray(item.models || []);

  if (!models.length) {
    return '<span class="info-label">暂无模型</span>';
  }

  var expanded = !!AppState.expandedModels[item.id];
  var needCollapse = models.length > MODEL_COLLAPSE_LIMIT;
  var visible = needCollapse && !expanded ? models.slice(0, MODEL_COLLAPSE_LIMIT) : models;

  var html = visible.map(function (model) {
    return (
      '<span class="model-pill" data-action="copy-model" data-model="' + escapeAttr(model) + '">' +
        escapeHtml(model) +
      '</span>'
    );
  }).join("");

  if (needCollapse && !expanded) {
    html += '<span class="model-pill model-more">+' + (models.length - MODEL_COLLAPSE_LIMIT) + '</span>';
  }

  return html;
}

function openAddEditor() {
  AppState.els.editorTitle.textContent = "新增配置";
  AppState.els.editingId.value = "";
  AppState.els.nameInput.value = "";
  AppState.els.providerInput.value = "openai";
  AppState.els.baseUrlInput.value = providerMap.openai.defaultBaseUrl;
  AppState.els.keyRows.innerHTML = "";
  AppState.editModels = [];

  addKeyRow("Key 1", "");

  renderEditModels();
  setStatus(AppState.els.editorStatus, "");
  openModal(AppState.els.editorModal);
}

function openEditEditor(item) {
  AppState.els.editorTitle.textContent = "编辑配置";
  AppState.els.editingId.value = item.id;
  AppState.els.nameInput.value = item.name || "";
  AppState.els.providerInput.value = item.provider || "custom";
  AppState.els.baseUrlInput.value = item.baseUrl || "";
  AppState.els.keyRows.innerHTML = "";

  var keys = normalizeKeys(item.keys);

  if (keys.length) {
    keys.forEach(function (k) {
      addKeyRow(k.label, k.value, k.id);
    });
  } else {
    addKeyRow("Key 1", "");
  }

  AppState.editModels = uniqueArray(item.models || []);

  renderEditModels();
  setStatus(AppState.els.editorStatus, "");
  openModal(AppState.els.editorModal);
}

function addKeyRow(label, value, id) {
  var row = document.createElement("div");
  row.className = "key-row";
  row.dataset.keyId = id || createId();

  row.innerHTML =
    '<input class="key-label-input" type="text" placeholder="标签" value="' + escapeAttr(label || "") + '" />' +
    '<input class="key-value-input" type="password" placeholder="API Key" value="' + escapeAttr(value || "") + '" />' +
    '<div class="key-row-actions">' +
      '<button class="small-btn key-toggle-btn" type="button">显示</button>' +
      '<button class="danger-btn small-btn key-remove-btn" type="button">删除</button>' +
    '</div>';

  var input = row.querySelector(".key-value-input");
  var toggle = row.querySelector(".key-toggle-btn");
  var remove = row.querySelector(".key-remove-btn");

  toggle.addEventListener("click", function () {
    input.type = input.type === "password" ? "text" : "password";
    toggle.textContent = input.type === "password" ? "显示" : "隐藏";
  });

  remove.addEventListener("click", function () {
    var rows = AppState.els.keyRows.querySelectorAll(".key-row");

    if (rows.length <= 1) {
      showToast("至少保留一个 API Key", "warning");
      return;
    }

    row.remove();
  });

  AppState.els.keyRows.appendChild(row);
}

function renderEditModels() {
  var box = AppState.els.modelEditList;

  if (!AppState.editModels.length) {
    box.innerHTML = '<span class="info-label">暂无模型</span>';
    return;
  }

  box.innerHTML = AppState.editModels.map(function (model) {
    return (
      '<span class="model-edit-item">' +
        '<span>' + escapeHtml(model) + '</span>' +
        '<button type="button" data-model="' + escapeAttr(model) + '">×</button>' +
      '</span>'
    );
  }).join("");

  box.querySelectorAll("button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      AppState.editModels = AppState.editModels.filter(function (m) {
        return m !== btn.dataset.model;
      });

      renderEditModels();
    });
  });
}

function refreshTestSelects() {
  var keySelect = AppState.els.testKeySelect;
  var options = [];

  AppState.records.forEach(function (record) {
    normalizeKeys(record.keys).forEach(function (key) {
      options.push({
        value: record.id + "::" + key.id,
        text: record.name + " / " + (key.label || "Key")
      });
    });
  });

  keySelect.innerHTML = options.length
    ? options.map(function (o) {
        return '<option value="' + escapeAttr(o.value) + '">' + escapeHtml(o.text) + '</option>';
      }).join("")
    : '<option value="">暂无 API Key</option>';

  updateTestModelSelect();
}

function updateTestModelSelect() {
  var keyValue = AppState.els.testKeySelect.value;
  var modelSelect = AppState.els.testModelSelect;

  if (!keyValue) {
    modelSelect.innerHTML = '<option value="">暂无模型</option>';
    return;
  }

  var recordId = keyValue.split("::")[0];
  var record = AppState.records.find(function (r) {
    return r.id === recordId;
  });

  var models = uniqueArray(record && record.models ? record.models : []);

  modelSelect.innerHTML = models.length
    ? models.map(function (m) {
        return '<option value="' + escapeAttr(m) + '">' + escapeHtml(m) + '</option>';
      }).join("")
    : '<option value="">此配置暂无模型</option>';
}