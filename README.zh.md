# Roadmap Skill

<p align="center">
  <img src="./imgs/roadmap-skill-web.png" alt="Roadmap Skill Kanban Board" width="900">
</p>

<p align="center">
  <strong>让 AI 帮你管理项目，让看板回归简洁</strong><br>
  零配置启动，本地数据，Agent 原生支持
</p>

<p align="center">
  简体中文 | <a href="README.md">English</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/roadmap-skill"><img src="https://img.shields.io/npm/v/roadmap-skill" alt="npm version"></a>
  <a href="https://github.com/shiquda/roadmap-skill/blob/main/LICENSE"><img src="https://img.shields.io/github/license/shiquda/roadmap-skill" alt="License"></a>
  <a href="https://www.npmjs.com/package/roadmap-skill"><img src="https://img.shields.io/npm/dm/roadmap-skill" alt="npm downloads"></a>
</p>

<p align="center">
  <a href="https://insiders.vscode.dev/redirect/mcp/install?name=roadmap&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22roadmap-skill%22%5D%7D"><img src="https://img.shields.io/badge/VS_Code-Install%20MCP%20Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white" alt="Install in VS Code"></a>
  <a href="https://insiders.vscode.dev/redirect/mcp/install?name=roadmap&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22roadmap-skill%22%5D%7D&quality=insiders"><img src="https://img.shields.io/badge/VS_Code_Insiders-Install%20MCP%20Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white" alt="Install in VS Code Insiders"></a>
</p>

---

## 为什么选择 Roadmap Skill？

| 你的困扰 | Roadmap Skill 的解决方式 |
|---------|-------------------------|
| 项目数据散落在第三方云端，缺乏安全感 | **本地优先** — 所有数据存储在你的电脑，完全掌控，离线可用 |
| 和 AI 对话时需要来回粘贴任务列表 | **Agent 原生** — AI 直接读写任务，对话中自然管理，零摩擦 |
| 纯文本管理缺乏直观性，但传统工具太重 | **美观看板** — 需要时打开浏览器，拖拽即可，不打扰编码流 |
| Vibe Coding 中的灵感、Bug 随手记在某处就忘了 | **收集箱** — 让 Agent 帮你沉淀零散想法，自动整理待办 |
| 任务太多不知从何开始，优先级全靠猜 | **智能推荐** — Agent 分析项目上下文，主动建议下一步工作 |

---

## 零配置快速开始

```bash
# 集成到你的 AI 助手（MCP 配置如下）
```

<details>
<summary><b>查看各平台配置</b></summary>

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add roadmap "npx -y roadmap-skill"
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

```json
{
  "mcpServers": {
    "roadmap": {
      "command": "npx",
      "args": ["-y", "roadmap-skill"]
    }
  }
}
```

</details>

<details>
<summary><b>Copilot</b></summary>

```bash
/mcp add
```

Or edit `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "roadmap": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "roadmap-skill"]
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

```json
{
  "mcpServers": {
    "roadmap": {
      "command": "npx",
      "args": ["-y", "roadmap-skill"]
    }
  }
}
```

</details>

<details>
<summary><b>JetBrains (via Cline)</b></summary>

Install Cline plugin, then add to `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "roadmap": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "roadmap-skill"]
    }
  }
}
```

</details>

<details>
<summary><b>Roo Code</b></summary>

```json
{
  "mcpServers": {
    "roadmap": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "roadmap-skill"]
    }
  }
}
```

</details>

<details>
<summary><b>Opencode</b></summary>

Edit `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "roadmap": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "roadmap-skill"
      ],
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary><b>Trae</b></summary>

Go to `Settings` -> `MCP` -> `Add new MCP Server`:

```json
{
  "mcpServers": {
    "roadmap": {
      "command": "npx",
      "args": ["-y", "roadmap-skill"]
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

```json
{
  "mcp": {
    "servers": {
      "roadmap": {
        "command": "npx",
        "args": ["-y", "roadmap-skill"]
      }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Follow Windsurf MCP documentation and use:

```json
{
  "mcpServers": {
    "roadmap": {
      "command": "npx",
      "args": ["-y", "roadmap-skill"]
    }
  }
}
```

</details>

<details>
<summary><b>Zed</b></summary>

```json
{
  "context_servers": {
    "roadmap": {
      "command": {
        "path": "npx",
        "args": ["-y", "roadmap-skill"]
      }
    }
  }
}
```

</details>

</details>

<br>

启动后，直接告诉你的 AI：

> "帮我创建一个网站重构项目，包含首页、关于页和联系表单的开发任务"

AI 会立即为你创建项目和任务，并自动写入本地存储。你可以随时打开 <http://localhost:7860> 查看可视化看板。

---

## 适合谁使用

| 场景 | Roadmap Skill 能为你做什么 |
|------|---------------------------|
| **独立开发者** | 用对话管理个人项目，避免在复杂工具中迷失 |
| **AI 重度用户** | 让 Agent 直接读写任务，告别来回粘贴的繁琐 |
| **Vibe Coder** | 随手让 AI 记录灵感，自动沉淀到收集箱 |
| **小团队协作** | 简单的任务分配与进度追踪，无需学习成本 |
| **隐私敏感者** | 数据完全本地存储，不上传任何云端服务 |

---

## 典型使用场景

### 1. Vibe Coding 中的灵感收集

正在和 AI 讨论新功能时，突然想到一个优化点：

> "帮我把这个想法记到收集箱：重构用户认证模块，使用 JWT + Refresh Token 方案"

AI 自动创建任务，稍后你打开看板就能看到待整理的想法。

### 2. 让 AI 规划项目结构

开始一个新项目时，直接让 AI 帮你分解：

> "创建一个电商后台管理项目，包含商品管理、订单处理、用户权限三个模块，每个模块分解为具体的开发任务"

AI 自动创建项目结构，你只需要在浏览器中打开看板，拖拽任务开始工作。

### 3. 进度追踪与状态更新

编码过程中随时询问：

> "我当前项目完成了多少百分比？有哪些高优先级任务还没开始？"

> "把用户登录功能的状态改为已完成，并创建对应的测试任务"

### 4. 团队协作分配

在对话中快速分配：

> "把前端页面的任务分配给 @张三，截止日期设为本周五，优先级设为高"

团队成员可以在看板中查看自己的任务列表。

---

## 安装

### 环境要求

- Node.js 18+ (推荐 20+)

### 全局安装

```bash
npm install -g roadmap-skill
```

### 免安装使用

```bash
npx roadmap-skill          # 完整 MCP 服务器
```

---

## 核心功能

| 功能 | 说明 |
|------|------|
| **看板视图** | 四列布局：待办、进行中、审核中、已完成 |
| **拖拽操作** | 拖拽任务即可更新状态，所见即所得 |
| **快速创建** | 点击任意列的 "+" 按钮，瞬间添加新任务 |
| **双重视图** | 紧凑模式概览全局，详细模式查看完整信息 |
| **智能搜索** | 跨所有项目快速查找任务，支持关键词过滤 |

---

## 支持平台

- ✅ **Claude Code** — 命令行 AI 助手
- ✅ **Claude Desktop** — 完整 MCP 集成
- ✅ **Cursor** — AI 驱动的 IDE
- ✅ **VS Code** — 通过 Cline 或 Roo Code 扩展
- ✅ **任意 MCP 客户端** — 标准 MCP 协议支持

---

## 数据存储

Roadmap Skill 采用**纯本地 JSON 文件存储**，所有数据保存在你的用户目录下：

| 平台 | 存储路径 |
|------|---------|
| macOS | `~/.roadmap-skill/data/` |
| Linux | `~/.roadmap-skill/data/` |
| Windows | `%USERPROFILE%\.roadmap-skill\data\` |

### 数据文件结构

```
.roadmap-skill/
└── data/
    ├── projects.json      # 项目列表
    ├── tasks.json         # 所有任务
    └── tags.json          # 标签定义
```

- ✅ **完全离线可用** — 无需网络连接
- ✅ **数据可迁移** — 直接复制文件夹即可备份
- ✅ **版本控制友好** — JSON 格式便于 diff 查看变更
- ✅ **隐私安全** — 数据永远不会离开你的电脑

---

## License

MIT © [shiquda](https://github.com/shiquda)

---

<p align="center">
  <strong>如果这个项目对你有帮助，欢迎 Star 支持！</strong>
</p>
