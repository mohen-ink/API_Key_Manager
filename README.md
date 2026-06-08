<div align="center">

  <h1>🌀</h1>

  # 🔐 API Key Manager

  **轻量级 API Key 记录管理工具**

  [![GitHub stars](https://img.shields.io/github/stars/Mina-kk/API_Key_Manager?style=flat-square&color=yellow)](https://github.com/Mina-kk/API_Key_Manager/stargazers)
  [![GitHub license](https://img.shields.io/github/license/Mina-kk/API_Key_Manager?style=flat-square&color=blue)](https://github.com/Mina-kk/API_Key_Manager/blob/main/LICENSE)
  [![JavaScript](https://img.shields.io/badge/JavaScript-71.4%25-f7df1e?style=flat-square)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)
  [![CSS](https://img.shields.io/badge/CSS-17.4%25-1572b6?style=flat-square)](https://developer.mozilla.org/zh-CN/docs/Web/CSS)
  [![HTML](https://img.shields.io/badge/HTML-11.2%25-e34f26?style=flat-square)](https://developer.mozilla.org/zh-CN/docs/Web/HTML)

  <p><b>一站式管理 OpenAI、Google Gemini、Claude 等多种 AI 服务的 API Key</b></p>

  [✨ 特性](#-特性) · [🚀 快速开始](#-快速开始) · [📖 使用指南](#-使用指南) · [🏗️ 项目结构](#-项目结构) · [🤝 贡献](#-贡献)
</div>

---

## 💡 项目简介

> 一个纯前端 + 可选后端代理的 API Key 集中管理工具，支持深暗/亮色双主题，帮助你轻松管理多个 AI 服务商的密钥、模型列表，并支持在线测试 API 连通性。

你是否曾经在浏览器里翻来翻去找不到那个 API Key？或者切换模型时手忙脚乱地复制粘贴？这个工具就是为你准备的 —— **把你所有 API Key 收纳在一个漂亮的网页里，随时查看、复制、测试。**

---

## ✨ 特性

| 特性 | 说明 |
|------|------|
| 🎨 **深暗/亮色主题** | 一键切换，保护眼睛的同时保持美观 |
| 🔑 **多 Key 管理** | 每个配置可添加多个 API Key，支持标签命名 |
| 🌐 **多服务商支持** | OpenAI · Google Gemini · Claude / Anthropic · 自定义 OpenAI 兼容 |
| 📋 **模型列表管理** | 从 API 拉取可用模型，或手动添加/清空 |
| 🧪 **在线模型测试** | 通过后端代理或浏览器直连发送测试对话 |
| 🔗 **后端代理** | 可选 Express 代理，解决 CORS 问题，支持局域网访问 |
| 📦 **导入/导出** | JSON 格式一键备份/恢复，支持剪贴板读取 |
| 🔍 **搜索过滤** | 按名称、URL、服务商、模型名实时筛选 |
| 📎 **快捷复制** | 一键复制 Key、Base URL、模型名、完整配置 |
| 📱 **响应式布局** | 完美适配桌面端和移动端 |
| 🆎 **侧边字母导航** | 移动端右侧字母索引导航，快速跳转 |
| 💾 **本地存储** | 所有数据存储在浏览器 localStorage，无需后端 |

---

## 🚀 快速开始

### 方式一：纯前端使用（推荐）

直接下载 `index.html` + `style.css` + `js/` 文件夹，用浏览器打开 `index.html` 即可使用。

```bash
git clone https://github.com/Mina-kk/API_Key_Manager.git
cd API_Key_Manager
# 直接用浏览器打开 index.html
