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