function $(id) {
  return document.getElementById(id);
}

function createId() {
  return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function ensureModelsUrl(baseUrl) {
  var clean = normalizeBaseUrl(baseUrl);
  if (clean.endsWith("/models")) return clean;
  return clean + "/models";
}

function uniqueArray(arr) {
  var list = arr || [];
  var map = {};
  var result = [];

  list.forEach(function (item) {
    var value = String(item || "").trim();
    if (!value) return;

    if (!map[value]) {
      map[value] = true;
      result.push(value);
    }
  });

  result.sort(function (a, b) {
    return a.localeCompare(b);
  });

  return result;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function maskKey(key) {
  key = String(key || "");
  if (!key) return "";
  if (key.length <= 12) return "*".repeat(key.length);
  return key.slice(0, 6) + "********" + key.slice(-6);
}

function formatTime(ts) {
  if (!ts) return "-";

  var d = new Date(ts);
  var pad = function (n) {
    return String(n).padStart(2, "0");
  };

  return (
    d.getFullYear() +
    "-" + pad(d.getMonth() + 1) +
    "-" + pad(d.getDate()) +
    " " + pad(d.getHours()) +
    ":" + pad(d.getMinutes())
  );
}

function getProviderLabel(provider) {
  if (providerMap[provider]) return providerMap[provider].label;
  return provider || "未知";
}

function normalizeKeys(keys) {
  if (!Array.isArray(keys)) return [];

  return keys
    .map(function (k, index) {
      return {
        id: k.id || createId(),
        label: k.label || "Key " + (index + 1),
        value: k.value || k.apiKey || ""
      };
    })
    .filter(function (k) {
      return !!k.value;
    });
}

function normalizeRecord(item) {
  item = item || {};

  var keys = normalizeKeys(item.keys);

  if (!keys.length && item.apiKey) {
    keys = [
      {
        id: createId(),
        label: "Key 1",
        value: item.apiKey
      }
    ];
  }

  return {
    id: item.id || createId(),
    name: item.name || "未命名配置",
    provider: item.provider || "custom",
    baseUrl: normalizeBaseUrl(item.baseUrl || ""),
    keys: keys,
    models: uniqueArray(item.models || []),
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || Date.now()
  };
}

function loadRecords() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    var arr = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(arr)) return [];

    return arr.map(function (item) {
      return normalizeRecord(item);
    });
  } catch (e) {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.records));
}

function getProxyUrl() {
  return normalizeBaseUrl(localStorage.getItem(PROXY_KEY) || "");
}

function setProxyUrl(url) {
  var clean = normalizeBaseUrl(url);

  if (clean) {
    localStorage.setItem(PROXY_KEY, clean);
  } else {
    localStorage.removeItem(PROXY_KEY);
  }
}

function getCurrentFetchMode() {
  var checked = document.querySelector("input[name='modelFetchMode']:checked");
  return checked ? checked.value : "proxy";
}

function showToast(message, type) {
  clearTimeout(AppState.toastTimer);

  var prefixMap = {
    success: "✓ ",
    error: "✕ ",
    warning: "⚠ ",
    info: ""
  };

  var prefix = prefixMap[type || "info"] || "";
  var toast = AppState.els.toast;

  if (!toast) return;

  toast.textContent = prefix + message;
  toast.classList.add("show");

  AppState.toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2200);
}

function copyText(text, message) {
  var value = String(text || "");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value).then(function () {
      showToast(message || "已复制", "success");
    }).catch(function () {
      fallbackCopy(value, message);
    });
  } else {
    fallbackCopy(value, message);
  }
}

function fallbackCopy(value, message) {
  var textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    showToast(message || "已复制", "success");
  } catch (e) {
    showToast("复制失败", "error");
  }

  textarea.remove();
}

function setStatus(el, text, type) {
  if (!el) return;

  el.textContent = text || "";
  el.className = "status-text" + (type ? " " + type : "");
}

function openModal(el) {
  if (el) el.classList.add("active");
}

function closeModal(el) {
  if (el) el.classList.remove("active");
}