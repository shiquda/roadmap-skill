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

---

## ✨ Why Roadmap Skill?

**Tired of juggling multiple project management tools?** Roadmap Skill brings your tasks directly into your AI workflow while offering a beautiful visual interface when you need it.

### Three Ways to Work

🎯 **Visual Kanban** — Drag and drop tasks between columns (Todo → In Progress → Review → Done)

🤖 **AI-Powered** — Ask Claude, Cursor, or any MCP-compatible AI to create, update, and organize tasks

⚡ **Instant Start** — One command launches the web interface, no configuration needed

---

## 🚀 Quick Start

### Option 1: Standalone Web App (Easiest)

```bash
npx roadmap-skill-web
```

Then open http://localhost:7860 in your browser.

### Option 2: Integrate with AI Assistants

Add to your AI assistant's MCP configuration:

**Claude Desktop:**
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

**Cursor:**
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

Then ask your AI:
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

- ✅ **Claude Desktop** — Full MCP integration
- ✅ **Claude Code** — Command-line AI assistant
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
