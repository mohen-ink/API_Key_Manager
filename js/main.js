document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  cacheElements();
  AppState.records = loadRecords();
  applyTheme();
  bindEvents();
  bindIndexBarTouch();
  renderAll();
  checkProxy();
}

function bindEvents() {
  var els = AppState.els;

  if (els.themeBtn) {
    els.themeBtn.addEventListener("click", toggleTheme);
  }

  if (els.addBtn) {
    els.addBtn.addEventListener("click", openAddEditor);
  }

  if (els.searchInput) {
    els.searchInput.addEventListener("input", function () {
      renderCards();
      renderNameIndex();
    });
  }

  if (els.providerInput) {
    els.providerInput.addEventListener("change", function () {
      var provider = els.providerInput.value;
      els.baseUrlInput.value = providerMap[provider] ? providerMap[provider].defaultBaseUrl : "";
    });
  }

  if (els.copyBaseInEditorBtn) {
    els.copyBaseInEditorBtn.addEventListener("click", function () {
      copyText(els.baseUrlInput.value.trim(), "Base URL 已复制");
    });
  }

  if (els.addKeyBtn) {
    els.addKeyBtn.addEventListener("click", function () {
      var count = els.keyRows.querySelectorAll(".key-row").length;
      addKeyRow("Key " + (count + 1), "");
    });
  }

  if (els.modelInput) {
    els.modelInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addModelFromEditor();
      }
    });
  }

  if (els.addModelBtn) {
    els.addModelBtn.addEventListener("click", addModelFromEditor);
  }

  if (els.clearEditModelsBtn) {
    els.clearEditModelsBtn.addEventListener("click", function () {
      if (!AppState.editModels.length) return;
      if (!confirm("确定清空当前编辑中的模型列表吗？")) return;
      AppState.editModels = [];
      renderEditModels();
    });
  }

  if (els.fetchModelsInEditorBtn) {
    els.fetchModelsInEditorBtn.addEventListener("click", fetchModelsInEditor);
  }

  if (els.saveConfigBtn) {
    els.saveConfigBtn.addEventListener("click", saveEditorRecord);
  }

  if (els.cancelEditorBtn) {
    els.cancelEditorBtn.addEventListener("click", function () {
      closeModal(els.editorModal);
    });
  }

  if (els.closeEditorBtn) {
    els.closeEditorBtn.addEventListener("click", function () {
      closeModal(els.editorModal);
    });
  }

  if (els.proxySettingBtn) {
    els.proxySettingBtn.addEventListener("click", openProxySetting);
  }

  if (els.closeProxyBtn) {
    els.closeProxyBtn.addEventListener("click", function () {
      closeModal(els.proxyModal);
    });
  }

  if (els.saveProxyBtn) {
    els.saveProxyBtn.addEventListener("click", saveProxySetting);
  }

  if (els.clearProxyBtn) {
    els.clearProxyBtn.addEventListener("click", clearProxySetting);
  }

  if (els.testProxyBtn) {
    els.testProxyBtn.addEventListener("click", testProxySetting);
  }

  if (els.modelTestBtn) {
    els.modelTestBtn.addEventListener("click", openTestModal);
  }

  if (els.closeTestBtn) {
    els.closeTestBtn.addEventListener("click", function () {
      closeModal(els.testModal);
    });
  }

  if (els.closeTestFooterBtn) {
    els.closeTestFooterBtn.addEventListener("click", function () {
      closeModal(els.testModal);
    });
  }

  if (els.testKeySelect) {
    els.testKeySelect.addEventListener("change", updateTestModelSelect);
  }

  if (els.proxyChatTestBtn) {
    els.proxyChatTestBtn.addEventListener("click", function () {
      runChatTest("proxy");
    });
  }

  if (els.browserChatTestBtn) {
    els.browserChatTestBtn.addEventListener("click", function () {
      runChatTest("browser");
    });
  }

  if (els.importBtn) {
    els.importBtn.addEventListener("click", function () {
      openModal(els.importModal);
    });
  }

  if (els.exportBtn) {
    els.exportBtn.addEventListener("click", exportRecords);
  }

  if (els.webdavBtn) {
    els.webdavBtn.addEventListener("click", openWebdavModal);
  }

  if (els.closeWebdavBtn) {
    els.closeWebdavBtn.addEventListener("click", function () {
      closeModal(els.webdavModal);
    });
  }

  if (els.saveWebdavBtn) {
    els.saveWebdavBtn.addEventListener("click", saveWebdavConfig);
  }

  if (els.testWebdavBtn) {
    els.testWebdavBtn.addEventListener("click", testWebdavConnection);
  }

  if (els.webdavBackupBtn) {
    els.webdavBackupBtn.addEventListener("click", doWebdavBackup);
  }

  if (els.webdavRestoreBtn) {
    els.webdavRestoreBtn.addEventListener("click", doWebdavRestore);
  }

  if (els.webdavRefreshBtn) {
    els.webdavRefreshBtn.addEventListener("click", refreshWebdavFileList);
  }

  if (els.closeImportBtn) {
    els.closeImportBtn.addEventListener("click", function () {
      closeModal(els.importModal);
    });
  }

  if (els.cancelImportBtn) {
    els.cancelImportBtn.addEventListener("click", function () {
      closeModal(els.importModal);
    });
  }

  if (els.confirmImportBtn) {
    els.confirmImportBtn.addEventListener("click", importRecords);
  }

  if (els.readClipboardBtn) {
    els.readClipboardBtn.addEventListener("click", readClipboardImport);
  }

  if (els.cardsContainer) {
    els.cardsContainer.addEventListener("click", handleCardAction);
  }

  [
    els.editorModal,
    els.proxyModal,
    els.testModal,
    els.importModal,
    els.webdavModal
  ].forEach(function (modal) {
    if (!modal) return;
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal(els.editorModal);
      closeModal(els.proxyModal);
      closeModal(els.testModal);
      closeModal(els.importModal);
      closeModal(els.webdavModal);
    }
  });
}

function bindIndexBarTouch() {
  var bar = document.getElementById("nameIndexBar");
  if (!bar) return;

  var hideTimer = null;

  function showBar() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    bar.classList.add("visible");
  }

  function hideBarAfterDelay() {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(function () {
      bar.classList.remove("visible");
      hideTimer = null;
    }, 1200);
  }

  function navigateFromTouch(touch) {
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.classList.contains("name-index-item")) {
      scrollToNameCard(el.dataset.indexChar);
    }
  }

  bar.addEventListener("touchstart", function (e) {
    showBar();
    if (e.touches.length) {
      navigateFromTouch(e.touches[0]);
    }
  }, { passive: true });

  bar.addEventListener("touchmove", function (e) {
    e.preventDefault();
    showBar();
    if (e.touches.length) {
      navigateFromTouch(e.touches[0]);
    }
  }, { passive: false });

  bar.addEventListener("touchend", function () {
    hideBarAfterDelay();
  });

  bar.addEventListener("touchcancel", function () {
    hideBarAfterDelay();
  });
}

function addModelFromEditor() {
  var input = AppState.els.modelInput;
  var value = input.value.trim();

  if (!value) return;

  if (AppState.editModels.indexOf(value) !== -1) {
    showToast("模型已存在", "warning");
    return;
  }

  AppState.editModels = uniqueArray(AppState.editModels.concat([value]));
  input.value = "";
  renderEditModels();
}

function fetchModelsInEditor() {
  var els = AppState.els;

  var provider = els.providerInput.value;
  var baseUrl = normalizeBaseUrl(els.baseUrlInput.value.trim());
  var firstKeyInput = els.keyRows.querySelector(".key-value-input");
  var firstKey = firstKeyInput ? firstKeyInput.value.trim() : "";
  var mode = getCurrentFetchMode();

  if (!baseUrl || !firstKey) {
    setStatus(els.editorStatus, "请先填写 Base URL 和至少一个 API Key", "error");
    return;
  }

  setStatus(
    els.editorStatus,
    mode === "proxy" ? "正在通过代理获取模型..." : "正在浏览器直连获取模型..."
  );

  fetchModels(
    {
      provider: provider,
      baseUrl: baseUrl,
      apiKey: firstKey
    },
    mode
  ).then(function (models) {
    AppState.editModels = uniqueArray(AppState.editModels.concat(models));
    renderEditModels();
    setStatus(els.editorStatus, "获取成功：" + models.length + " 个模型", "success");
    showToast("模型获取成功", "success");
  }).catch(function (err) {
    setStatus(els.editorStatus, err.message, "error");
    showToast(err.message, "error");
  });
}

function saveEditorRecord() {
  var els = AppState.els;

  var id = els.editingId.value || createId();
  var name = els.nameInput.value.trim();
  var provider = els.providerInput.value;
  var baseUrl = normalizeBaseUrl(els.baseUrlInput.value.trim());

  var rows = Array.prototype.slice.call(els.keyRows.querySelectorAll(".key-row"));

  var keys = rows.map(function (row, index) {
    return {
      id: row.dataset.keyId || createId(),
      label: row.querySelector(".key-label-input").value.trim() || "Key " + (index + 1),
      value: row.querySelector(".key-value-input").value.trim()
    };
  }).filter(function (k) {
    return !!k.value;
  });

  if (!name) {
    showToast("请输入名称", "error");
    return;
  }

  if (!baseUrl) {
    showToast("请输入 API Base URL", "error");
    return;
  }

  if (!keys.length) {
    showToast("请至少填写一个 API Key", "error");
    return;
  }

  var old = AppState.records.find(function (r) {
    return r.id === id;
  });

  var record = {
    id: id,
    name: name,
    provider: provider,
    baseUrl: baseUrl,
    keys: keys,
    models: uniqueArray(AppState.editModels),
    createdAt: old ? old.createdAt : Date.now(),
    updatedAt: Date.now()
  };

  if (old) {
    AppState.records = AppState.records.map(function (r) {
      return r.id === id ? record : r;
    });
  } else {
    AppState.records.unshift(record);
  }

  saveRecords();
  closeModal(els.editorModal);
  renderAll();
  showToast(old ? "已更新" : "已新增", "success");
}

function handleCardAction(e) {
  var target = e.target.closest("[data-action]");
  if (!target) return;

  var card = target.closest(".api-card");
  var id = card ? card.dataset.id : "";
  var action = target.dataset.action;

  var item = AppState.records.find(function (r) {
    return r.id === id;
  });

  if (!item) return;

  if (action === "edit") {
    openEditEditor(item);
    return;
  }

  if (action === "delete") {
    if (!confirm("确定删除「" + item.name + "」吗？")) return;
    AppState.records = AppState.records.filter(function (r) {
      return r.id !== id;
    });
    delete AppState.expandedModels[id];
    saveRecords();
    renderAll();
    return;
  }

  if (action === "copy-base") {
    copyText(item.baseUrl, "Base URL 已复制");
    return;
  }

  if (action === "copy-key") {
    var keyId = target.dataset.keyId;
    var key = normalizeKeys(item.keys).find(function (k) {
      return k.id === keyId;
    });
    if (key) {
      copyText(key.value, "API Key 已复制");
    }
    return;
  }

  if (action === "copy-all-keys") {
    var text = normalizeKeys(item.keys)
      .map(function (k) {
        return (k.label || "Key") + ": " + k.value;
      })
      .join("\n");
    copyText(text, "全部 Key 已复制");
    return;
  }

  if (action === "copy-config") {
    copyText(JSON.stringify(item, null, 2), "完整配置已复制");
    return;
  }

  if (action === "copy-model") {
    copyText(target.dataset.model, "模型名已复制");
    return;
  }

  if (action === "toggle-models") {
    AppState.expandedModels[id] = !AppState.expandedModels[id];
    renderCards();
    return;
  }

  if (action === "clear-models") {
    if (!confirm("确定清空此配置的模型列表吗？")) return;
    item.models = [];
    item.updatedAt = Date.now();
    AppState.expandedModels[id] = false;
    saveRecords();
    renderAll();
    return;
  }

  if (action === "fetch-models-proxy") {
    fetchModelsForCard(item, "proxy");
    return;
  }

  if (action === "fetch-models-browser") {
    fetchModelsForCard(item, "browser");
    return;
  }
}

function fetchModelsForCard(item, mode) {
  var key = normalizeKeys(item.keys)[0];

  if (!key) {
    showToast("此配置没有 API Key", "error");
    return;
  }

  showToast(mode === "proxy" ? "正在代理获取模型..." : "正在浏览器获取模型...", "info");

  fetchModels(
    {
      provider: item.provider,
      baseUrl: item.baseUrl,
      apiKey: key.value
    },
    mode
  ).then(function (models) {
    item.models = uniqueArray((item.models || []).concat(models));
    item.updatedAt = Date.now();
    saveRecords();
    renderAll();
    showToast("获取成功：" + models.length + " 个模型", "success");
  }).catch(function (err) {
    showToast(err.message, "error");
  });
}

function openProxySetting() {
  AppState.els.proxyUrlInput.value = getProxyUrl();
  setStatus(AppState.els.proxySettingStatus, "");
  openModal(AppState.els.proxyModal);
}

function saveProxySetting() {
  var url = AppState.els.proxyUrlInput.value.trim();
  setProxyUrl(url);
  showToast("代理地址已保存", "success");
  checkProxy();
  closeModal(AppState.els.proxyModal);
}

function clearProxySetting() {
  setProxyUrl("");
  AppState.els.proxyUrlInput.value = "";
  setStatus(AppState.els.proxySettingStatus, "已清空代理地址", "success");
  checkProxy();
}

function testProxySetting() {
  var url = normalizeBaseUrl(AppState.els.proxyUrlInput.value.trim());

  if (!url) {
    setStatus(AppState.els.proxySettingStatus, "请先填写代理地址", "error");
    return;
  }

  setStatus(AppState.els.proxySettingStatus, "正在测试代理...");

  fetch(url + "/health").then(function (res) {
    return res.json().catch(function () {
      return null;
    }).then(function (data) {
      if (res.ok && data && data.ok) {
        setStatus(AppState.els.proxySettingStatus, "代理可用", "success");
      } else {
        throw new Error("代理返回异常");
      }
    });
  }).catch(function (err) {
    setStatus(AppState.els.proxySettingStatus, "代理不可用：" + err.message, "error");
  });
}

function openTestModal() {
  refreshTestSelects();
  AppState.els.testResultBox.textContent = "暂无结果";
  openModal(AppState.els.testModal);
}

function runChatTest(mode) {
  var keyValue = AppState.els.testKeySelect.value;
  var model = AppState.els.testModelSelect.value;
  var prompt = AppState.els.testPromptInput.value.trim();

  if (!keyValue) {
    showToast("请选择 API Key", "error");
    return;
  }

  if (!model) {
    showToast("请选择模型", "error");
    return;
  }

  var parts = keyValue.split("::");
  var recordId = parts[0];
  var keyId = parts[1];

  var record = AppState.records.find(function (r) {
    return r.id === recordId;
  });

  var key = normalizeKeys(record ? record.keys : []).find(function (k) {
    return k.id === keyId;
  });

  if (!record || !key) {
    showToast("API Key 不存在", "error");
    return;
  }

  AppState.els.testResultBox.textContent =
    mode === "proxy" ? "正在通过代理测试..." : "正在浏览器直连测试...";

  chatTest(
    {
      provider: record.provider,
      baseUrl: record.baseUrl,
      apiKey: key.value,
      model: model,
      prompt: prompt
    },
    mode
  ).then(function (reply) {
    AppState.els.testResultBox.textContent = reply;
  }).catch(function (err) {
    AppState.els.testResultBox.textContent = "测试失败：\n" + err.message;
  });
}

function exportRecords() {
  var json = JSON.stringify(AppState.records, null, 2);
  var date = new Date().toISOString().slice(0, 10);
  var fixedFileName = "apikey_vault_backup.json";
  var dateFileName = "apikey_vault_backup_" + date + ".json";

  if (window.AndroidBridge && typeof window.AndroidBridge.writeFile === "function") {
    try {
      var ok1 = window.AndroidBridge.writeFile(fixedFileName, json);
      var ok2 = window.AndroidBridge.writeFile(dateFileName, json);
      if (ok1 || ok2) {
        var dir = "";
        if (typeof window.AndroidBridge.getFilesDir === "function") {
          dir = window.AndroidBridge.getFilesDir() || "";
        }
        if (dir) {
          showToast("已导出到：" + dir + "/" + fixedFileName, "success");
        } else {
          showToast("已导出到程序私有目录", "success");
        }
        return;
      }
      showToast("导出失败：原生写入返回失败", "error");
      return;
    } catch (e) {
      showToast("导出失败：" + e.message, "error");
      return;
    }
  }

  try {
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = dateFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已尝试浏览器下载", "success");
  } catch (e) {
    showToast("当前环境不支持导出：" + e.message, "error");
  }
}

function readClipboardImport() {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    showToast("当前环境不支持读取剪贴板，请手动粘贴", "error");
    return;
  }
  navigator.clipboard.readText().then(function (text) {
    AppState.els.importTextarea.value = text;
  }).catch(function () {
    showToast("无法读取剪贴板，请手动粘贴", "error");
  });
}

function importRecords() {
  try {
    var raw = AppState.els.importTextarea.value.trim();
    var data = JSON.parse(raw);
    var arr = Array.isArray(data) ? data : [data];
    arr.forEach(function (item) {
      AppState.records.push(normalizeRecord(item));
    });
    saveRecords();
    closeModal(AppState.els.importModal);
    renderAll();
    showToast("导入成功", "success");
  } catch (e) {
    showToast("JSON 格式错误", "error");
  }
}

function toggleTheme() {
  var isLight = document.body.classList.toggle("light");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

function applyTheme() {
  var theme = localStorage.getItem(THEME_KEY) || "dark";
  document.body.classList.toggle("light", theme === "light");
}

(function () {
  var _originalRenderAll = renderAll;
  renderAll = function () {
    _originalRenderAll();
    renderNameIndex();
  };
})();

function renderNameIndex() {
  var list = document.getElementById("nameIndexList");
  if (!list) return;

  var cards = document.querySelectorAll(".api-card");
  var chars = [];

  cards.forEach(function (card) {
    var h3 = card.querySelector(".card-title h3");
    if (!h3) return;
    var name = (h3.textContent || "").trim();
    if (!name) return;
    var first = name.charAt(0);
    if (/[a-zA-Z]/.test(first)) first = first.toUpperCase();
    chars.push(first);
  });

  var unique = [];
  var seen = {};
  chars.forEach(function (c) {
    if (!seen[c]) {
      seen[c] = true;
      unique.push(c);
    }
  });

  unique.sort(function (a, b) {
    return a.localeCompare(b, "zh-Hans-CN");
  });

  if (!unique.length) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = unique.map(function (c) {
    return (
      '<span class="name-index-item" data-index-char="' +
      escapeAttr(c) +
      '">' +
      escapeHtml(c) +
      "</span>"
    );
  }).join("");
}

function scrollToNameCard(targetChar) {
  var cards = document.querySelectorAll(".api-card");
  var found = null;

  cards.forEach(function (card) {
    if (found) return;
    var h3 = card.querySelector(".card-title h3");
    if (!h3) return;
    var name = (h3.textContent || "").trim();
    if (!name) return;
    var first = name.charAt(0);
    if (/[a-zA-Z]/.test(first)) first = first.toUpperCase();
    if (first === targetChar) {
      found = card;
    }
  });

  if (found) {
    found.scrollIntoView({ behavior: "smooth", block: "start" });
    found.style.transition = "box-shadow 0.2s";
    found.style.boxShadow = "0 0 0 3px var(--primary)";
    setTimeout(function () {
      found.style.boxShadow = "";
    }, 800);
  }
}

/* ═══════════════════════════════════════════
   WebDAV 备份/恢复
   ═══════════════════════════════════════════ */

function openWebdavModal() {
  loadWebdavConfig();
  openModal(AppState.els.webdavModal);
  refreshWebdavFileList();
}

function loadWebdavConfig() {
  var config = getWebdavConfig();
  if (config) {
    AppState.els.webdavUrlInput.value = config.url || "";
    AppState.els.webdavUsernameInput.value = config.username || "";
    AppState.els.webdavPasswordInput.value = "";
    AppState.els.webdavPasswordInput.placeholder = config.password ? "已配置，留空保持不变" : "未配置";
    AppState.els.webdavPathInput.value = config.path || "/";

    if (config.password) {
      setStatus(AppState.els.webdavStatus, "✓ 已配置 WebDAV", "success");
    } else {
      setStatus(AppState.els.webdavStatus, "");
    }
  } else {
    AppState.els.webdavUrlInput.value = "";
    AppState.els.webdavUsernameInput.value = "";
    AppState.els.webdavPasswordInput.value = "";
    AppState.els.webdavPasswordInput.placeholder = "未配置";
    AppState.els.webdavPathInput.value = "/";
    setStatus(AppState.els.webdavStatus, "");
  }
}

function saveWebdavConfig() {
  var url = AppState.els.webdavUrlInput.value.trim();
  var username = AppState.els.webdavUsernameInput.value.trim();
  var password = AppState.els.webdavPasswordInput.value;
  var path = AppState.els.webdavPathInput.value.trim() || "/";

  if (!url) {
    setStatus(AppState.els.webdavStatus, "请填写 WebDAV 服务器地址", "error");
    return;
  }

  // 如果密码框为空或仍是占位符，保留原密码
  var existing = getWebdavConfig();
  if (!password && existing && existing.password) {
    password = existing.password;
  }

  var config = { url: url, username: username, password: password, path: path };
  localStorage.setItem(WEBDAV_CONFIG_KEY, JSON.stringify(config));
  AppState.els.webdavPasswordInput.placeholder = "已配置，留空保持不变";
  AppState.els.webdavPasswordInput.value = "";
  setStatus(AppState.els.webdavStatus, "✓ 已保存 WebDAV 配置", "success");
  showToast("WebDAV 配置已保存", "success");
}

function testWebdavConnection() {
  var url = AppState.els.webdavUrlInput.value.trim();
  if (!url) {
    setStatus(AppState.els.webdavStatus, "请先填写 WebDAV 服务器地址", "error");
    return;
  }

  // 先保存当前输入，再测试
  var username = AppState.els.webdavUsernameInput.value.trim();
  var password = AppState.els.webdavPasswordInput.value;
  var path = AppState.els.webdavPathInput.value.trim() || "/";
  var existing = getWebdavConfig();
  if (!password && existing && existing.password) {
    password = existing.password;
  }
  var config = { url: url, username: username, password: password, path: path };
  localStorage.setItem(WEBDAV_CONFIG_KEY, JSON.stringify(config));

  setStatus(AppState.els.webdavStatus, "正在测试连接...", "");

  webdavCheckConnection("auto").then(function () {
    setStatus(AppState.els.webdavStatus, "✓ 连接成功！", "success");
    showToast("WebDAV 连接成功", "success");
  }).catch(function (err) {
    setStatus(AppState.els.webdavStatus, "✕ " + err.message, "error");
  });
}

function doWebdavBackup() {
  if (!AppState.records.length) {
    showToast("暂无配置可备份", "warning");
    return;
  }

  var now = new Date();
  var ts = now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0") + "_" +
    String(now.getHours()).padStart(2, "0") + "-" +
    String(now.getMinutes()).padStart(2, "0") + "-" +
    String(now.getSeconds()).padStart(2, "0");
  var filename = "api-key-manager-backup_" + ts + ".json";

  setStatus(AppState.els.webdavStatus, "正在备份到 WebDAV...", "");

  webdavBackup(AppState.records, "auto", filename).then(function () {
    setStatus(AppState.els.webdavStatus, "✓ 备份成功！" + filename, "success");
    showToast("已备份到 WebDAV", "success");
    refreshWebdavFileList();
  }).catch(function (err) {
    setStatus(AppState.els.webdavStatus, "✕ 备份失败：" + err.message, "error");
  });
}

function refreshWebdavFileList() {
  var select = AppState.els.webdavFileSelect;
  if (!select) return;

  select.innerHTML = '<option value="">刷新中...</option>';
  select.disabled = true;

  webdavListFiles("auto").then(function (files) {
    if (!files || !files.length) {
      select.innerHTML = '<option value="">暂无备份文件</option>';
    } else {
      select.innerHTML = files.map(function (f) {
        var label = f.name;
        if (f.modified) label += " (" + f.modified.replace(/T/, " ").replace("Z", "") + ")";
        return '<option value="' + escapeAttr(f.name) + '">' + escapeHtml(label) + '</option>';
      }).join("");
    }
  }).catch(function (err) {
    select.innerHTML = '<option value="">获取失败：' + escapeHtml(err.message) + '</option>';
  }).then(function () {
    select.disabled = false;
  });
}

function doWebdavRestore() {
  var select = AppState.els.webdavFileSelect;
  var filename = select ? select.value : "";

  if (!filename) {
    setStatus(AppState.els.webdavStatus, "请先在列表中选择一个备份文件", "error");
    return;
  }

  if (AppState.records.length > 0) {
    if (!confirm("恢复将覆盖当前所有配置（" + AppState.records.length + " 条），确定继续吗？")) return;
  }

  setStatus(AppState.els.webdavStatus, "正在从 WebDAV 恢复 " + filename + "...", "");

  webdavRestore("auto", filename).then(function (data) {
    if (!Array.isArray(data)) {
      setStatus(AppState.els.webdavStatus, "✕ 备份文件格式不正确", "error");
      return;
    }

    AppState.records = data.map(function (item) {
      return normalizeRecord(item);
    });

    saveRecords();
    renderAll();
    refreshTestSelects();

    setStatus(AppState.els.webdavStatus, "✓ 恢复成功！共 " + AppState.records.length + " 条配置", "success");
    showToast("已从 WebDAV 恢复 " + AppState.records.length + " 条配置", "success");
  }).catch(function (err) {
    setStatus(AppState.els.webdavStatus, "✕ 恢复失败：" + err.message, "error");
  });
}