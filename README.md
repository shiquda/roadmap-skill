# Roadmap Skill MCP Server

A comprehensive MCP (Model Context Protocol) server for project roadmap management with task tracking, tagging, templates, and web visualization.

## Features

### 19 MCP Tools

#### Project Management (5 tools)
- **`create_project`** - Create a new project roadmap with name, description, type, and dates
- **`list_projects`** - List all projects with task and milestone counts
- **`get_project`** - Get detailed project information including tasks, tags, and milestones
- **`update_project`** - Update project properties (name, description, status, dates, type)
- **`delete_project`** - Delete a project and all its associated data

#### Task Management (6 tools)
- **`create_task`** - Create tasks with title, description, priority, tags, due date, and assignee
- **`list_tasks`** - List tasks with filters (project, status, priority, tags, assignee, due date)
- **`get_task`** - Get a specific task by project ID and task ID
- **`update_task`** - Update task properties including status, priority, tags, and assignments
- **`delete_task`** - Delete a specific task from a project
- **`batch_update_tasks`** - Update multiple tasks at once (status, priority, tags)

#### Tag Management (5 tools)
- **`create_tag`** - Create colored tags for organizing tasks
- **`list_tags`** - List all tags in a project
- **`update_tag`** - Update tag name, color, or description
- **`delete_tag`** - Delete a tag and remove it from all tasks
- **`get_tasks_by_tag`** - Get all tasks that have a specific tag

#### Web Interface (2 tools)
- **`open_web_interface`** - Launch the web visualization interface (default port: 7860)
- **`close_web_interface`** - Stop the web interface server

#### Templates (3 tools)
- **`list_templates`** - List all available project templates
- **`get_template`** - Get detailed information about a specific template
- **`apply_template`** - Create a new project from a template with pre-defined tasks and tags

### 4 MCP Resources

Access project data directly via resource URIs:

- **`roadmap://projects`** - Returns a list of all projects with basic metadata
- **`roadmap://project/{id}`** - Returns detailed information about a specific project
- **`roadmap://project/{id}/tasks`** - Returns all tasks for a specific project, grouped by status
- **`roadmap://project/{id}/progress`** - Returns progress statistics including completion percentage, overdue tasks, and priority breakdown

### 4 MCP Prompts

Interactive prompts to guide users:

- **`project_planning`** - Step-by-step guidance for planning a new project with milestones and initial tasks
- **`task_management`** - Best practices for organizing, prioritizing, and managing tasks
- **`roadmap_overview`** - Comprehensive dashboard overview of all projects and their health status
- **`milestone_review`** - Framework for reviewing and evaluating project milestones

### Web Visualization Interface

A built-in React-based web interface for visualizing roadmaps:
- Interactive Kanban board view
- Project timeline visualization
- Task status tracking
- Progress charts and statistics

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/roadmap-skill.git
cd roadmap-skill

# Install dependencies
npm install

# Build the project
npm run build
```

### Install via npm (when published)

```bash
npm install -g roadmap-skill
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration file (`claude_desktop_config.json`):

**Windows:**
```json
{
  "mcpServers": {
    "roadmap-skill": {
      "command": "node",
      "args": ["C:\\path\\to\\roadmap-skill\\dist\\index.js"]
    }
  }
}
```

**macOS/Linux:**
```json
{
  "mcpServers": {
    "roadmap-skill": {
      "command": "node",
      "args": ["/path/to/roadmap-skill/dist/index.js"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "roadmap-skill": {
      "command": "node",
      "args": ["/path/to/roadmap-skill/dist/index.js"]
    }
  }
}
```

### VS Code (with MCP extension)

Add to your VS Code settings:

```json
{
  "mcp.servers": {
    "roadmap-skill": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/roadmap-skill/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Creating a Project

```json
{
  "name": "create_project",
  "arguments": {
    "name": "Learn TypeScript",
    "description": "Master TypeScript for web development",
    "projectType": "skill-tree",
    "startDate": "2024-01-01",
    "targetDate": "2024-03-31"
  }
}
```

### Creating a Task

```json
{
  "name": "create_task",
  "arguments": {
    "projectId": "proj_123",
    "title": "Complete TypeScript basics",
    "description": "Learn basic TypeScript syntax and types",
    "priority": "high",
    "tags": ["learning", "basics"],
    "dueDate": "2024-01-15"
  }
}
```

### Using Templates

```json
{
  "name": "apply_template",
  "arguments": {
    "templateName": "web-development",
    "projectName": "My Website",
    "description": "Personal portfolio website",
    "startDate": "2024-01-01",
    "targetDate": "2024-02-28"
  }
}
```

### Opening Web Interface

```json
{
  "name": "open_web_interface",
  "arguments": {
    "port": 7860
  }
}
```

## Development

### Scripts

```bash
# Start development mode with watch
npm run dev

# Build for production
npm run build

# Build web interface only
npm run build:web

# Run type checking
npm run typecheck

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

### Project Structure

```
roadmap-skill/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server setup
│   ├── models/               # Data models and types
│   │   └── index.ts
│   ├── storage/              # Data persistence layer
│   │   └── index.ts
│   ├── tools/                # MCP tool implementations
│   │   ├── index.ts
│   │   ├── project-tools.ts  # Project CRUD tools
│   │   ├── task-tools.ts     # Task management tools
│   │   ├── tag-tools.ts      # Tag management tools
│   │   ├── web-tools.ts      # Web interface tools
│   │   └── template-tools.ts # Template tools
│   ├── resources/            # MCP resource implementations
│   │   ├── index.ts
│   │   └── project-resources.ts
│   ├── prompts/              # MCP prompt templates
│   │   ├── index.ts
│   │   └── project-prompts.ts
│   ├── web/                  # Web interface
│   │   └── server.ts
│   └── utils/                # Utility functions
│       ├── file-helpers.ts
│       └── path-helpers.ts
├── templates/                # Project templates
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── dist/                     # Compiled output
├── docs/                     # Documentation
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vite.config.ts
```

## Data Storage

Projects are stored as JSON files in the `data/` directory (created automatically). Each project file contains:

- Project metadata
- Tasks
- Tags
- Milestones

## Project Types

- **`roadmap`** - Traditional project roadmap with milestones and timeline
- **`skill-tree`** - Learning path with progressive skill acquisition
- **`kanban`** - Kanban-style board for task management

## Task Status

- **`todo`** - Task waiting to be started
- **`in-progress`** - Task currently being worked on
- **`review`** - Task completed and awaiting review
- **`done`** - Task completed

## Task Priority

- **`critical`** - Blockers, urgent deadlines, essential functionality
- **`high`** - Important features, near-term deadlines
- **`medium`** - Standard work, nice-to-have features
- **`low`** - Backlog items, future improvements

## Documentation

- [API Reference](docs/API.md) - Detailed documentation of all tools, resources, and prompts
- [Usage Examples](docs/EXAMPLES.md) - More comprehensive usage examples

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/yourusername/roadmap-skill/issues) page.
