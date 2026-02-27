# Roadmap Skill

<p align="center">
  <img src="./imgs/roadmap-skill-web.png" alt="Roadmap Skill Kanban Board" width="900">
</p>

<p align="center">
  <strong>人类与 AI Agent 共享的项目看板</strong><br>
  你看到的，Agent 也看到。对话里规划，看板里审阅。或者相反。
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

## 这个 MCP 有什么不同？

**人机共享视图** — 在对话里和 Agent 一起规划任务，也可以直接在看板上手动编辑，两种方式实时互通。你和Agent 始终能获取到最新状态。

**Agent 原生** — 以 MCP 服务器形式运行。AI 可以在对话中直接创建、更新、查询任务。

**轻量看板** — 你想看的时候打开 `localhost:7860`。懒得开浏览器？直接让 Agent `/open-web-ui` 也行。

**本地优先** — 数据存在你的机器上。无需账号，无云同步，不依赖任何第三方服务。

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
<details>
<summary><b>Codex CLI / Codex IDE</b></summary>

**一键安装（推荐）：**

```bash
codex mcp add roadmap -- npx -y roadmap-skill
```

**手动配置** — 编辑 `~/.codex/config.toml`：

```toml
[mcp_servers.roadmap]
command = "npx"
args = ["-y", "roadmap-skill"]
```

> **Windows**：无需 `cmd /c` 包装 — Codex 会直接管理子进程。
> **服务器名称**：必须匹配 `^[a-zA-Z0-9_-]+$`，含空格或括号的名称会被拒绝。
> **注意**：Codex CLI 和 Codex VSCode 扩展共享同一个 `~/.codex/config.toml`，语法错误会同时影响两者。

</details>

</details>

<br>

启动后，直接告诉你的 AI：

> "帮我创建一个网站重构项目，包含首页、关于页和联系表单的开发任务"

AI 会立即为你创建项目和任务，并自动写入本地存储。你可以随时打开 <http://localhost:7860> 查看可视化看板。

---

## 适合谁使用

独立开发者、AI 重度用户、Vibe Coder — 想让 Agent 真正参与项目协作，而不只是写代码的人。

## 典型使用场景

### 1. 不打断流地记录想法

VibeCoding时，突然想到一个新idea/有新Bug：

> "记一下：把认证模块改成 JWT + refresh token 方案"

直接使用 `/quick-capture` 命令，或者直接说“帮我记一下”，Agent 就会把这个想法变成一个项目的代办，保存在本地，然后继续工作。等有空了再回来看，任务已经在那里了，不用担心忘记，也不用打断当前的思路去切换工具。

### 2. 让 Agent 帮你划分任务优先级

> "这个月的 OKR 是完成用户系统重构，能不能帮我把相关的任务都列出来，并且分析一下哪些任务应该有限做？"

直接使用 `/auto-prioritize` 命令，让 Agent 根据当前的项目状态，给已有的任务合理调整优先级。

### 3. 让 Agent 自动给你推荐接下来做什么

> "当前项目还剩什么？有没有高优先级的任务还没动？"

或者直接使用 `/suggest-tasks` 命令，让 Agent 根据当前进度和优先级给你推荐下一步行动。

不用切换标签页，不用复制粘贴。直接问就行。

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

- ✅ **Claude Code, Codex, OpenCode** — 命令行 AI 助手
- ✅ **Cursor, VS Code** — AI 驱动的 IDE
- ✅ **任意支持 MCP 的客户端** — 标准 MCP 协议支持

---

## 数据存储

Roadmap Skill 采用**纯本地 JSON 文件存储**，所有数据保存在你的用户目录下：

| 平台 | 存储路径 |
|------|---------|
| Windows | `%USERPROFILE%\.roadmap-skill` |
| macOS | `~/.roadmap-skill/` |
| Linux | `~/.roadmap-skill/` |

你可以在前端界面中选择导出/导入备份文件。

---

## 参与贡献
欢迎任何形式的贡献！无论是 Bug 反馈、功能建议还是 Pull Request，都可以直接在 [GitHub](https://github.com/shiquda/roadmap-skill) 上提 Issue 或 PR。
如果你想添加新功能，建议先开 Issue 讨论一下方向。

---

## License

MIT © [shiquda](https://github.com/shiquda)

---

<p align="center">
  <strong>如果这个项目对你有帮助，欢迎 Star 支持！</strong>
</p>
