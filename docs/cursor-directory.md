# Cursor Directory Submission

## Package Information

**Name**: Roadmap Skill
**Description**: Visual Kanban board for project management with AI integration
**Repository**: https://github.com/shiquda/roadmap-skill
**NPM Package**: roadmap-skill

## Installation

### For Cursor Users

Add to your `~/.cursor/mcp.json`:

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

Or use the one-click install button (if available).

### Standalone Web UI

```bash
npx roadmap-skill-web
```

## Features

- 🎯 **Visual Kanban Board** - Drag and drop tasks between Todo, In Progress, Review, Done
- 🤖 **AI-Powered** - Ask Cursor to create, update, and organize tasks
- ⚡ **Instant Start** - No configuration needed, works out of the box
- 📊 **Project Management** - Track progress, priorities, and deadlines
- 🔍 **Smart Search** - Find tasks across all projects instantly

## Example Prompts

Try asking Cursor:

- "Create a new project called 'Website Redesign' with tasks for homepage, about page, and contact form"
- "Show me all high priority tasks due this week"
- "Move the authentication task to in-progress"
- "What's my overall progress across all projects?"

## Screenshots

![Kanban Board](https://github.com/shiquda/roadmap-skill/raw/main/imgs/roadmap-skill-web.png)

## Links

- NPM: https://www.npmjs.com/package/roadmap-skill
- GitHub: https://github.com/shiquda/roadmap-skill
