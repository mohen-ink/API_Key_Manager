const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8765;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "proxy running",
    time: new Date().toISOString()
  });
});

app.post("/proxy/models", async (req, res) => {
  const { provider, baseUrl, apiKey } = req.body || {};

  if (!provider || !baseUrl || !apiKey) {
    return res.status(400).json({
      ok: false,
      error: "缺少 provider / baseUrl / apiKey"
    });
  }

  try {
    let models = [];

    if (provider === "openai" || provider === "custom") {
      models = await fetchOpenAIModels(baseUrl, apiKey);
    } else if (provider === "google") {
      models = await fetchGoogleModels(baseUrl, apiKey);
    } else if (provider === "claude") {
      models = await fetchClaudeModels(baseUrl, apiKey);
    } else {
      throw new Error("不支持的服务商");
    }

    res.json({
      ok: true,
      models
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message || "获取模型失败"
    });
  }
});

app.post("/proxy/chat", async (req, res) => {
  const { provider, baseUrl, apiKey, model, prompt } = req.body || {};

  if (!provider || !baseUrl || !apiKey || !model || !prompt) {
    return res.status(400).json({
      ok: false,
      error: "缺少必要参数"
    });
  }

  try {
    let reply = "";

    if (provider === "google") {
      reply = await googleChat(baseUrl, apiKey, model, prompt);
    } else if (provider === "claude") {
      reply = await claudeChat(baseUrl, apiKey, model, prompt);
    } else {
      reply = await openAIChat(baseUrl, apiKey, model, prompt);
    }

    res.json({
      ok: true,
      reply
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message || "测试失败"
    });
  }
});

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function ensureModelsUrl(baseUrl) {
  const clean = normalizeBaseUrl(baseUrl);
  if (clean.endsWith("/models")) return clean;
  return clean + "/models";
}

function uniqueArray(arr) {
  return [...new Set((arr || []).filter(Boolean).map(x => String(x).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

async function safeText(res) {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

async function fetchOpenAIModels(baseUrl, apiKey) {
  const res = await fetch(ensureModelsUrl(baseUrl), {
    headers: {
      Authorization: "Bearer " + apiKey
    }
  });

  if (!res.ok) {
    throw new Error("OpenAI 模型接口失败 HTTP " + res.status + " " + await safeText(res));
  }

  const data = await res.json();

  let models = [];

  if (Array.isArray(data.data)) {
    models = data.data.map(x => typeof x === "string" ? x : x.id || x.name).filter(Boolean);
  }

  if (Array.isArray(data.models)) {
    models = data.models.map(x => typeof x === "string" ? x : x.id || x.name).filter(Boolean);
  }

  return uniqueArray(models);
}

async function fetchGoogleModels(baseUrl, apiKey) {
  const url = normalizeBaseUrl(baseUrl) + "/models?key=" + encodeURIComponent(apiKey);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Google 模型接口失败 HTTP " + res.status + " " + await safeText(res));
  }

  const data = await res.json();

  const models = Array.isArray(data.models)
    ? data.models
        .map(x => x.name || x.displayName)
        .filter(Boolean)
        .map(x => String(x).replace(/^models\//, ""))
    : [];

  return uniqueArray(models);
}

async function fetchClaudeModels(baseUrl, apiKey) {
  const res = await fetch(normalizeBaseUrl(baseUrl) + "/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    }
  });

  if (!res.ok) {
    throw new Error("Claude 模型接口失败 HTTP " + res.status + " " + await safeText(res));
  }

  const data = await res.json();

  const models = Array.isArray(data.data)
    ? data.data.map(x => typeof x === "string" ? x : x.id || x.name).filter(Boolean)
    : [];

  return uniqueArray(models);
}

async function openAIChat(baseUrl, apiKey, model, prompt) {
  const res = await fetch(normalizeBaseUrl(baseUrl) + "/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300
    })
  });

  if (!res.ok) {
    throw new Error("OpenAI 测试失败 HTTP " + res.status + " " + await safeText(res));
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
}

async function googleChat(baseUrl, apiKey, model, prompt) {
  const url =
    normalizeBaseUrl(baseUrl) +
    "/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error("Google 测试失败 HTTP " + res.status + " " + await safeText(res));
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data, null, 2);
}

async function claudeChat(baseUrl, apiKey, model, prompt) {
  const res = await fetch(normalizeBaseUrl(baseUrl) + "/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error("Claude 测试失败 HTTP " + res.status + " " + await safeText(res));
  }

  const data = await res.json();

  if (Array.isArray(data.content)) {
    return data.content.map(x => x.text || "").join("\n") || JSON.stringify(data, null, 2);
  }

  return JSON.stringify(data, null, 2);
}

/* ═══════════════════════════════════════════
   WebDAV 代理
   ═══════════════════════════════════════════ */

function webdavRequest(config, method, urlPath, body, contentType) {
  return new Promise(function (resolve, reject) {
    // 确保 urlPath 是相对路径，不以 / 开头，否则会替换掉 base URL 的路径
    var relativePath = urlPath.replace(/^\/+/, "");
    // base URL 必须以 / 结尾，否则 new URL 会把最后一段当文件名替换
    var baseUrl = config.url.replace(/\/?$/, "/");
    var parsed;
    try {
      parsed = new URL(relativePath, baseUrl);
    } catch (e) {
      return reject(new Error("WebDAV URL 无效"));
    }

    // PROPFIND 必须有 body
    if (method === "PROPFIND" && !body) {
      body = '<?xml version="1.0" encoding="utf-8" ?>' +
        '<D:propfind xmlns:D="DAV:"><D:prop><D:resourcetype/></D:prop></D:propfind>';
      contentType = "application/xml";
    }

    var lib = parsed.protocol === "https:" ? require("https") : require("http");

    var headers = {
      "User-Agent": "APIKeyManager/1.0"
    };

    if (config.username) {
      headers["Authorization"] =
        "Basic " + Buffer.from(config.username + ":" + (config.password || "")).toString("base64");
    }

    if (body) {
      headers["Content-Type"] = contentType || "application/octet-stream";
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    if (method === "PROPFIND") {
      headers["Depth"] = body ? "1" : "0";
    }

    var options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + (parsed.search || ""),
      method: method,
      headers: headers
    };

    var req = lib.request(options, function (res) {
      var chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        var buf = Buffer.concat(chunks);
        var status = res.statusCode;

        // 处理重定向
        if ((status === 301 || status === 302 || status === 307) && res.headers.location) {
          return webdavRequestRedirect(config, method, res.headers.location, body, contentType, resolve, reject);
        }

        if (method === "GET") {
          if (status >= 200 && status < 300) {
            resolve({ status: status, body: buf.toString("utf8") });
          } else {
            reject(new Error("WebDAV GET 失败 HTTP " + status));
          }
          return;
        }

        if (status >= 200 && status < 300) {
          resolve({ status: status, body: buf.toString("utf8") });
        } else if (status === 401) {
          reject(new Error("认证失败 (401)：请检查用户名和密码"));
        } else if (status === 403) {
          reject(new Error("权限不足 (403)：请检查账号权限"));
        } else if (status === 404) {
          reject(new Error("路径不存在 (404)：请检查 WebDAV 地址和目录"));
        } else {
          reject(new Error("WebDAV 请求失败 HTTP " + status));
        }
      });
    });

    req.on("error", function (err) {
      reject(new Error("WebDAV 请求失败：" + err.message));
    });

    req.setTimeout(15000, function () {
      req.destroy();
      reject(new Error("WebDAV 请求超时（15秒）"));
    });

    if (body) req.write(body);
    req.end();
  });
}

function webdavRequestRedirect(config, method, location, body, contentType, resolve, reject) {
  // 直接跟随重定向完整 URL
  var redirectParsed;
  try {
    redirectParsed = new URL(location);
  } catch (e) {
    return reject(new Error("WebDAV 重定向地址无效"));
  }

  var redirectConfig = Object.assign({}, config, { url: redirectParsed.origin });
  var redirectPath = redirectParsed.pathname + (redirectParsed.search || "");
  return webdavRequestRaw(redirectConfig, method, redirectPath, body, contentType, resolve, reject);
}

// 原始版本，不做 URL 合并，直接拼接 pathname
function webdavRequestRaw(config, method, urlPath, body, contentType, resolve, reject) {
  var parsed;
  try {
    parsed = new URL(urlPath, config.url);
  } catch (e) {
    return reject(new Error("WebDAV URL 无效"));
  }

  if (method === "PROPFIND" && !body) {
    body = '<?xml version="1.0" encoding="utf-8" ?>' +
      '<D:propfind xmlns:D="DAV:"><D:prop><D:resourcetype/></D:prop></D:propfind>';
    contentType = "application/xml";
  }

  var lib = parsed.protocol === "https:" ? require("https") : require("http");
  var headers = { "User-Agent": "APIKeyManager/1.0" };

  if (config.username) {
    headers["Authorization"] =
      "Basic " + Buffer.from(config.username + ":" + (config.password || "")).toString("base64");
  }

  if (body) {
    headers["Content-Type"] = contentType || "application/octet-stream";
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  if (method === "PROPFIND") {
    headers["Depth"] = body ? "1" : "0";
  }

  var options = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
    path: parsed.pathname + (parsed.search || ""),
    method: method,
    headers: headers
  };

  var req = lib.request(options, function (res) {
    var chunks = [];
    res.on("data", function (chunk) { chunks.push(chunk); });
    res.on("end", function () {
      var buf = Buffer.concat(chunks);
      var status = res.statusCode;

      if ((status === 301 || status === 302 || status === 307) && res.headers.location) {
        return webdavRequestRedirect(config, method, res.headers.location, body, contentType, resolve, reject);
      }

      if (status >= 200 && status < 300) {
        resolve({ status: status, body: buf.toString("utf8") });
      } else {
        reject(new Error("WebDAV 失败 HTTP " + status));
      }
    });
  });

  req.on("error", function (err) {
    reject(new Error("WebDAV 请求失败：" + err.message));
  });

  req.setTimeout(30000, function () {
    req.destroy();
    reject(new Error("WebDAV 请求超时"));
  });

  if (body) req.write(body);
  req.end();
}

app.post("/webdav/list", async (req, res) => {
  try {
    var config = req.body.config;
    if (!config || !config.url) {
      return res.status(400).json({ ok: false, error: "缺少 WebDAV 配置" });
    }
    var body = '<?xml version="1.0" encoding="utf-8" ?>' +
      '<D:propfind xmlns:D="DAV:"><D:prop><D:displayname/><D:getlastmodified/><D:getcontentlength/></D:prop></D:propfind>';
    // 列出用户配置目录下的文件
    var listPath = (config.path || "/").replace(/\/*$/, "");
    var result = await webdavRequest(config, "PROPFIND", listPath, body, "application/xml");
    var files = parseDavFiles(result.body);
    res.json({ ok: true, files: files });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

function parseDavFiles(xml) {
  var files = [];
  var hrefPattern = /<[^>]*:href>([^<]+)<\/[^>]*:href>/gi;
  var displayPattern = /<[^>]*:displayname>([^<]*)<\/[^>]*:displayname>/gi;
  var modifiedPattern = /<[^>]*:getlastmodified>([^<]*)<\/[^>]*:getlastmodified>/gi;

  var hrefs = [], match;
  while ((match = hrefPattern.exec(xml)) !== null) {
    hrefs.push(match[1]);
  }

  var displays = [];
  while ((match = displayPattern.exec(xml)) !== null) {
    displays.push(match[1]);
  }

  var modifieds = [];
  while ((match = modifiedPattern.exec(xml)) !== null) {
    modifieds.push(match[1]);
  }

  for (var i = 0; i < hrefs.length; i++) {
    var name = displays[i] || hrefs[i].split("/").filter(Boolean).pop() || "";
    if (!/^api-key-manager-backup_/.test(name)) continue;
    files.push({
      name: name,
      path: hrefs[i],
      modified: modifieds[i] || ""
    });
  }

  return files.reverse();
}

app.post("/webdav/backup", async (req, res) => {
  try {
    var config = req.body.config;
    var data = req.body.data;
    var filename = req.body.filename || "api-key-manager-backup.json";
    if (!config || !config.url || !data) {
      return res.status(400).json({ ok: false, error: "缺少 WebDAV 配置或数据" });
    }
    var path = (config.path || "/").replace(/\/*$/, "") + "/" + filename;
    await webdavRequest(config, "PUT", path, JSON.stringify(data, null, 2), "application/json");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/webdav/restore", async (req, res) => {
  try {
    var config = req.body.config;
    var filename = req.body.filename || "api-key-manager-backup.json";
    if (!config || !config.url) {
      return res.status(400).json({ ok: false, error: "缺少 WebDAV 配置" });
    }
    var path = (config.path || "/").replace(/\/*$/, "") + "/" + filename;
    var result = await webdavRequest(config, "GET", path, null, null);
    try {
      var json = JSON.parse(result.body);
      res.json({ ok: true, data: json });
    } catch (e) {
      res.status(500).json({ ok: false, error: "备份文件内容不是有效 JSON" });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/webdav/check", async (req, res) => {
  try {
    var config = req.body.config;
    if (!config || !config.url) {
      return res.status(400).json({ ok: false, error: "缺少 WebDAV 配置" });
    }
    var testPath = (config.path || "/").replace(/\/*$/, "") + "/api-key-manager-backup.json";
    await webdavRequest(config, "PROPFIND", (config.path || "/"), null, null);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("API Key Manager 已启动");
  console.log(`前端页面：http://localhost:${PORT}`);
  console.log(`代理健康检查：http://localhost:${PORT}/health`);
  console.log(`WebDAV 备份：http://localhost:${PORT}/webdav/backup`);
  console.log("");
});