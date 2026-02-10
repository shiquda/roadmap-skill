# Awesome MCP PR Template

## PR 标题
Add roadmap-skill: Visual Kanban board for project management

## PR 内容

I'd like to add **roadmap-skill** to the awesome-mcp-servers list.

### Package Info

- **Name**: roadmap-skill
- **Description**: Visual project management with drag-and-drop Kanban boards. Manage tasks through AI assistants or directly in your browser.
- **Author**: @shiquda
- **NPM**: https://www.npmjs.com/package/roadmap-skill
- **GitHub**: https://github.com/shiquda/roadmap-skill

### Features

🎯 **Visual Kanban Board** - Drag and drop tasks between columns (Todo → In Progress → Review → Done)

🤖 **AI-Powered** - Ask Claude, Cursor, or any MCP-compatible AI to create, update, and organize tasks

⚡ **Instant Start** - One command launches the web interface:
```bash
npx roadmap-skill-web
```

📊 **Project Management** - Track progress, priorities, due dates, and assignees

🔍 **Smart Search** - Find tasks across all projects instantly

### Installation

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

### Screenshot

![Kanban Board](https://github.com/shiquda/roadmap-skill/raw/main/imgs/roadmap-skill-web.png)

### Category Suggestion

- [ ] Browser Automation
- [ ] Cloud Platforms
- [ ] Communication
- [x] **Data & Visualization** (recommended)
- [ ] Databases
- [ ] Developer Tools
- [ ] File Systems
- [ ] Knowledge & Memory
- [ ] Monitoring
- [ ] Search

### Checklist

- [x] Package is published on npm
- [x] Has a valid README with usage instructions
- [x] Open source with MIT license
- [x] Tested and working
- [x] Includes screenshot/demo

---

**Note to maintainers**: Thank you for maintaining this awesome list! Please let me know if you need any additional information.
