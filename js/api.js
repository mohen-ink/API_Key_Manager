function checkProxy() {
  var proxyUrl = getProxyUrl();

  if (!proxyUrl) {
    AppState.els.proxyStatus.textContent = "未配置";
    AppState.els.proxyStatus.style.color = "var(--warning)";
    return Promise.resolve(false);
  }

  return fetch(proxyUrl + "/health", {
    method: "GET"
  }).then(function (res) {
    return res.json().then(function (data) {
      if (res.ok && data && data.ok) {
        AppState.els.proxyStatus.textContent = "正常";
        AppState.els.proxyStatus.style.color = "var(--success)";
        return true;
      }

      throw new Error("代理异常");
    });
  }).catch(function () {
    AppState.els.proxyStatus.textContent = "不可用";
    AppState.els.proxyStatus.style.color = "var(--danger)";
    return false;
  });
}

function fetchModels(payload, mode) {
  if (mode === "proxy") {
    return fetchModelsByProxy(payload);
  }

  return fetchModelsByBrowser(payload);
}

function fetchModelsByProxy(payload) {
  var proxyUrl = getProxyUrl();

  if (!proxyUrl) {
    return Promise.reject(new Error("未配置后端代理地址，请先点击顶部「代理设置」"));
  }

  return fetch(proxyUrl + "/proxy/models", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).then(function (res) {
    return res.json().catch(function () {
      return null;
    }).then(function (data) {
      if (!res.ok || !data || !data.ok) {
        throw new Error(data && data.error ? data.error : "代理获取模型失败");
      }

      return uniqueArray(data.models || []);
    });
  });
}

function fetchModelsByBrowser(payload) {
  var provider = payload.provider;

  if (provider === "openai" || provider === "custom") {
    return fetchOpenAIModelsBrowser(payload.baseUrl, payload.apiKey);
  }

  if (provider === "google") {
    return fetchGoogleModelsBrowser(payload.baseUrl, payload.apiKey);
  }

  if (provider === "claude") {
    return fetchClaudeModelsBrowser(payload.baseUrl, payload.apiKey);
  }

  return Promise.reject(new Error("不支持的服务商"));
}

function fetchOpenAIModelsBrowser(baseUrl, apiKey) {
  return fetch(ensureModelsUrl(baseUrl), {
    method: "GET",
    headers: {
      Authorization: "Bearer " + apiKey
    }
  }).then(function (res) {
    if (!res.ok) {
      return res.text().catch(function () {
        return "";
      }).then(function (text) {
        throw new Error("浏览器获取失败 HTTP " + res.status + " " + text.slice(0, 160));
      });
    }

    return res.json();
  }).then(function (data) {
    var models = [];

    if (Array.isArray(data.data)) {
      models = models.concat(data.data.map(function (x) {
        return typeof x === "string" ? x : x.id || x.name;
      }).filter(Boolean));
    }

    if (Array.isArray(data.models)) {
      models = models.concat(data.models.map(function (x) {
        return typeof x === "string" ? x : x.id || x.name;
      }).filter(Boolean));
    }

    if (!models.length) throw new Error("未解析到模型列表");

    return uniqueArray(models);
  });
}

function fetchGoogleModelsBrowser(baseUrl, apiKey) {
  var url = normalizeBaseUrl(baseUrl) + "/models?key=" + encodeURIComponent(apiKey);

  return fetch(url).then(function (res) {
    if (!res.ok) {
      return res.text().catch(function () {
        return "";
      }).then(function (text) {
        throw new Error("Google 获取失败 HTTP " + res.status + " " + text.slice(0, 160));
      });
    }

    return res.json();
  }).then(function (data) {
    var models = Array.isArray(data.models)
      ? data.models
          .map(function (x) {
            return x.name || x.displayName;
          })
          .filter(Boolean)
          .map(function (x) {
            return String(x).replace(/^models\//, "");
          })
      : [];

    if (!models.length) throw new Error("未解析到模型列表");

    return uniqueArray(models);
  });
}

function fetchClaudeModelsBrowser(baseUrl, apiKey) {
  return fetch(normalizeBaseUrl(baseUrl) + "/models", {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    }
  }).then(function (res) {
    if (!res.ok) {
      return res.text().catch(function () {
        return "";
      }).then(function (text) {
        throw new Error("Claude 获取失败 HTTP " + res.status + " " + text.slice(0, 160));
      });
    }

    return res.json();
  }).then(function (data) {
    var models = Array.isArray(data.data)
      ? data.data
          .map(function (x) {
            return typeof x === "string" ? x : x.id || x.name;
          })
          .filter(Boolean)
      : [];

    if (!models.length) throw new Error("未解析到模型列表");

    return uniqueArray(models);
  });
}

function chatTest(payload, mode) {
  if (mode === "proxy") {
    return chatTestByProxy(payload);
  }

  return chatTestByBrowser(payload);
}

function chatTestByProxy(payload) {
  var proxyUrl = getProxyUrl();

  if (!proxyUrl) {
    return Promise.reject(new Error("未配置后端代理地址"));
  }

  return fetch(proxyUrl + "/proxy/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).then(function (res) {
    return res.json().catch(function () {
      return null;
    }).then(function (data) {
      if (!res.ok || !data || !data.ok) {
        throw new Error(data && data.error ? data.error : "代理测试失败");
      }

      return data.reply || JSON.stringify(data.raw || data, null, 2);
    });
  });
}

function chatTestByBrowser(payload) {
  if (payload.provider === "google") {
    return googleChatBrowser(payload);
  }

  if (payload.provider === "claude") {
    return claudeChatBrowser(payload);
  }

  return openAIChatBrowser(payload);
}

function openAIChatBrowser(payload) {
  var url = normalizeBaseUrl(payload.baseUrl) + "/chat/completions";

  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + payload.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: payload.model,
      messages: [
        {
          role: "user",
          content: payload.prompt
        }
      ],
      max_tokens: 300
    })
  }).then(function (res) {
    if (!res.ok) {
      return res.text().catch(function () {
        return "";
      }).then(function (text) {
        throw new Error("浏览器测试失败 HTTP " + res.status + " " + text.slice(0, 180));
      });
    }

    return res.json();
  }).then(function (data) {
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content || "";
    }

    return JSON.stringify(data, null, 2);
  });
}

function googleChatBrowser(payload) {
  var url =
    normalizeBaseUrl(payload.baseUrl) +
    "/models/" +
    encodeURIComponent(payload.model) +
    ":generateContent?key=" +
    encodeURIComponent(payload.apiKey);

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: payload.prompt
            }
          ]
        }
      ]
    })
  }).then(function (res) {
    if (!res.ok) {
      return res.text().catch(function () {
        return "";
      }).then(function (text) {
        throw new Error("Google 测试失败 HTTP " + res.status + " " + text.slice(0, 180));
      });
    }

    return res.json();
  }).then(function (data) {
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
    ) {
      return data.candidates[0].content.parts[0].text || "";
    }

    return JSON.stringify(data, null, 2);
  });
}

function claudeChatBrowser(payload) {
  var url = normalizeBaseUrl(payload.baseUrl) + "/messages";

  return fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": payload.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: payload.model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: payload.prompt
        }
      ]
    })
  }).then(function (res) {
    if (!res.ok) {
      return res.text().catch(function () {
        return "";
      }).then(function (text) {
        throw new Error("Claude 测试失败 HTTP " + res.status + " " + text.slice(0, 180));
      });
    }

    return res.json();
  }).then(function (data) {
    if (Array.isArray(data.content)) {
      var text = data.content.map(function (x) {
        return x.text || "";
      }).join("\n");

      return text || JSON.stringify(data, null, 2);
    }

    return JSON.stringify(data, null, 2);
  });
}

/* ═══════════════════════════════════════════
   WebDAV 备份/恢复
   ═══════════════════════════════════════════ */

function getWebdavConfig() {
  try {
    var raw = localStorage.getItem(WEBDAV_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function webdavBackup(data, mode, filename) {
  var config = getWebdavConfig();
  if (!config || !config.url) {
    return Promise.reject(new Error("请先配置 WebDAV 服务器地址"));
  }

  var json = JSON.stringify(data, null, 2);
  var fn = filename || "api-key-manager-backup.json";

  if (mode === "proxy") {
    return webdavBackupByProxy(config, json, fn);
  }

  return webdavBackupByBrowser(config, json, fn).catch(function (err) {
    if (err && err.message && (
      err.message.indexOf("认证失败") !== -1 ||
      err.message.indexOf("权限不足") !== -1
    )) {
      throw err;
    }
    return webdavBackupByProxy(config, json, fn);
  });
}

function webdavBackupByProxy(config, json, filename) {
  var proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return Promise.reject(new Error("浏览器直连失败（CORS），且未配置后端代理，无法备份"));
  }
  return fetch(proxyUrl + "/webdav/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config: config, data: JSON.parse(json), filename: filename })
  }).then(function (res) {
    return res.json().catch(function () { return null; }).then(function (result) {
      if (!res.ok || !result || !result.ok) {
        throw new Error((result && result.error) || "代理备份失败");
      }
    });
  });
}

function webdavBackupByBrowser(config, json, filename) {
  var path = (config.path || "/").replace(/\/*$/, "") + "/" + filename;
  var url = normalizeBaseUrl(config.url).replace(/\/$/, "") + path;

  return fetch(url, {
    method: "PUT",
    headers: buildWebdavHeaders(config, "application/json"),
    body: json
  }).then(function (res) {
    if (res.status === 401) throw new Error("认证失败 (401)：请检查用户名和密码");
    if (res.status === 403) throw new Error("权限不足 (403)");
    if (!res.ok) {
      return res.text().catch(function () { return ""; }).then(function () {
        throw new Error("WebDAV 备份失败 HTTP " + res.status);
      });
    }
  });
}

function webdavRestore(mode, filename) {
  var config = getWebdavConfig();
  if (!config || !config.url) {
    return Promise.reject(new Error("请先配置 WebDAV 服务器地址"));
  }

  var fn = filename || "api-key-manager-backup.json";

  if (mode === "proxy") {
    return webdavRestoreByProxy(config, fn);
  }

  return webdavRestoreByBrowser(config, fn).catch(function (err) {
    if (err && err.message && (
      err.message.indexOf("认证失败") !== -1 ||
      err.message.indexOf("权限不足") !== -1
    )) {
      throw err;
    }
    return webdavRestoreByProxy(config, fn);
  });
}

function webdavRestoreByProxy(config, filename) {
  var proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return Promise.reject(new Error("浏览器直连失败（CORS），且未配置后端代理，无法恢复"));
  }
  return fetch(proxyUrl + "/webdav/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config: config, filename: filename })
  }).then(function (res) {
    return res.json().catch(function () { return null; }).then(function (result) {
      if (!res.ok || !result || !result.ok) {
        throw new Error((result && result.error) || "代理恢复失败");
      }
      return result.data;
    });
  });
}

function webdavRestoreByBrowser(config, filename) {
  var path = (config.path || "/").replace(/\/*$/, "") + "/" + filename;
  var url = normalizeBaseUrl(config.url).replace(/\/$/, "") + path;

  return fetch(url, {
    method: "GET",
    headers: buildWebdavHeaders(config)
  }).then(function (res) {
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("备份文件不存在（404）");
      }
      return res.text().catch(function () { return ""; }).then(function () {
        throw new Error("WebDAV 恢复失败 HTTP " + res.status);
      });
    }
    return res.json();
  });
}

function webdavListFiles(mode) {
  var config = getWebdavConfig();
  if (!config || !config.url) {
    return Promise.reject(new Error("请先配置 WebDAV 服务器地址"));
  }

  if (mode === "proxy") {
    return webdavListByProxy(config);
  }

  return webdavListByBrowser(config).catch(function () {
    return webdavListByProxy(config);
  });
}

function webdavListByProxy(config) {
  var proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return Promise.reject(new Error("未配置后端代理"));
  }
  return fetch(proxyUrl + "/webdav/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config: config })
  }).then(function (res) {
    return res.json().catch(function () { return null; }).then(function (result) {
      if (!res.ok || !result || !result.ok) {
        throw new Error((result && result.error) || "获取文件列表失败");
      }
      return result.files || [];
    });
  });
}

function webdavListByBrowser(config) {
  var url = normalizeBaseUrl(config.url).replace(/\/$/, "");
  var body = '<?xml version="1.0" encoding="utf-8" ?>' +
    '<D:propfind xmlns:D="DAV:"><D:prop><D:displayname/><D:getlastmodified/></D:prop></D:propfind>';

  return fetch(url, {
    method: "PROPFIND",
    headers: buildWebdavHeaders(config, "application/xml", body.length, { "Depth": "1" }),
    body: body
  }).then(function (res) {
    if (!res.ok) throw new Error("获取文件列表失败 HTTP " + res.status);
    return res.text();
  }).then(function (xml) {
    var files = [];
    var hrefs = [], match;
    var re1 = /<[^>]*:href>([^<]+)<\/[^>]*:href>/gi;
    while ((match = re1.exec(xml)) !== null) {
      hrefs.push(match[1]);
    }
    for (var i = 0; i < hrefs.length; i++) {
      var name = hrefs[i].split("/").filter(Boolean).pop() || "";
      if (/^api-key-manager-backup_/.test(name)) {
        files.push({ name: name, path: hrefs[i], modified: "" });
      }
    }
    return files.reverse();
  });
}

function webdavCheckConnection(mode) {
  var config = getWebdavConfig();
  if (!config || !config.url) {
    return Promise.reject(new Error("请先填写 WebDAV 服务器地址"));
  }

  if (mode === "proxy") {
    return webdavCheckByProxy(config);
  }

  return webdavCheckByBrowser(config).catch(function (err) {
    // 认证/权限错误是真实错误，不需要回退代理
    if (err && err.message && (
      err.message.indexOf("认证失败") !== -1 ||
      err.message.indexOf("权限不足") !== -1
    )) {
      throw err;
    }
    // 其他错误（CORS、网络、方法不支持）→ 回退代理
    return webdavCheckByProxy(config);
  });
}

function webdavCheckByProxy(config) {
  var proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return Promise.reject(new Error("浏览器直连失败（CORS），且未配置后端代理"));
  }
  return fetch(proxyUrl + "/webdav/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config: config })
  }).then(function (res) {
    return res.json().catch(function () { return null; }).then(function (result) {
      if (!res.ok || !result || !result.ok) {
        throw new Error((result && result.error) || "连接失败");
      }
    });
  });
}

function webdavCheckByBrowser(config) {
  var url = normalizeBaseUrl(config.url);

  // 用 HEAD 测试连接（浏览器 fetch 不支持 PROPFIND）
  return fetch(url, {
    method: "HEAD",
    headers: buildWebdavHeaders(config)
  }).then(function (res) {
    if (res.status === 401) {
      throw new Error("认证失败：用户名或密码错误");
    }
    if (res.status === 403) {
      throw new Error("权限不足：请检查账号密码和目录权限");
    }
    if (res.status >= 400) {
      throw new Error("连接失败 HTTP " + res.status);
    }
  });
}

function buildWebdavHeaders(config, contentType, contentLength, extra) {
  var headers = {};
  if (config.username) {
    headers["Authorization"] = "Basic " + btoa(config.username + ":" + (config.password || ""));
  }
  if (contentType) headers["Content-Type"] = contentType;
  if (extra) {
    Object.keys(extra).forEach(function (k) { headers[k] = extra[k]; });
  }
  return headers;
}