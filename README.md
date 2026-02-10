# 🗺️ Roadmap Skill

<p align="center">
  <img src="./imgs/roadmap-skill-web.png" alt="Roadmap Skill Kanban Board" width="900">
</p>

<p align="center">
  <strong>Visual project management with drag-and-drop Kanban boards</strong><br>
  Manage tasks through AI assistants or directly in your browser
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

## Why Roadmap Skill?

**Tired of juggling multiple project management tools?** Roadmap Skill brings your tasks directly into your AI workflow while offering a beautiful visual interface when you need it.

### Three Ways to Work

🎯 **Visual Kanban** — Drag and drop tasks between columns (Todo → In Progress → Review → Done)

🤖 **AI-Powered** — Ask Claude, Cursor, or any MCP-compatible AI to create, update, and organize tasks

⚡ **Instant Start** — One command launches the web interface, no configuration needed

---

## 🚀 Quick Start

### Option 1: Standalone Web App

```bash
npx roadmap-skill-web
```

Then open <http://localhost:7860> in your browser.

### Option 2: Integrate with AI Assistants

Add to your AI assistant's MCP configuration:

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add roadmap npx -y roadmap-skill
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

Then ask your AI (e.g.):
> "Create a project called 'Website Redesign' with tasks for homepage, about page, and contact form"

---

## 💡 What You Can Do

### Plan Projects Visually

- See all your tasks organized in Kanban columns
- Switch between compact and detailed card views
- Filter by status, project, or search keywords
- Drag tasks to update their status instantly

### Work with AI

- "Show me all high priority tasks due this week"
- "Move the authentication task to in-progress"
- "Create a new project for mobile app with 5 initial tasks"
- "What's my overall progress across all projects?"

### Collaborate & Track

- Assign tasks to team members
- Set due dates and priorities
- Add tags to organize related work
- Track completion statistics

---

## 📦 Installation

### Requirements

- Node.js 18+ (20+ recommended)

### One-Line Install

```bash
npm install -g roadmap-skill
```

### Or Use Without Installing

```bash
npx roadmap-skill-web      # Just the web interface
npx roadmap-skill          # Full MCP server
```

---

## 🎨 Interface Features

| Feature | Description |
|---------|-------------|
| **Kanban Board** | Four columns: Todo, In Progress, Review, Done |
| **Drag & Drop** | Move tasks between columns to update status |
| **Quick Add** | Click "+" on any column to add tasks instantly |
| **Dual Views** | Compact mode for overview, Detailed mode for full info |
| **Smart Search** | Find tasks across all projects instantly |

---

## 🔧 Supported Platforms

- ✅ **Claude Code** — Command-line AI assistant
- ✅ **Claude Desktop** — Full MCP integration
- ✅ **Cursor** — AI-powered IDE
- ✅ **VS Code** — Via Cline or Roo Code extensions
- ✅ **Any MCP Client** — Standard MCP protocol support

---

## 📄 License

MIT © [shiquda](https://github.com/shiquda)

---

<p align="center">
  <strong>Star ⭐ this repo if you find it helpful!</strong>
</p>
