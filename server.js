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

app.listen(PORT, "0.0.0.0", () => {
  console.log("API Key Manager Proxy started");
  console.log("Local: http://localhost:" + PORT);
  console.log("LAN:   http://你的电脑IP:" + PORT);
});OST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await safeText(response);
    throw new Error(`Claude 对话失败：HTTP ${response.status} ${text}`);
  }

  const data = await response.json();

  return (
    data.content?.map(item => item.text).join("") ||
    JSON.stringify(data, null, 2)
  );
}

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("API Key Manager 已启动");
  console.log(`前端页面：http://localhost:${PORT}`);
  console.log(`代理健康检查：http://localhost:${PORT}/health`);
  console.log("");
});