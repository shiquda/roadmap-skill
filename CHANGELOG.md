# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-10

### Added
- **Kanban Priority Sorting**: Tasks are now sorted by priority (Critical > High > Medium > Low) within each column
- **Task Creation Modal**: Added a dedicated modal for creating tasks with priority selection
- **Smooth Animations**: Added CSS animations for modal transitions, task card hover effects, and drag interactions
- **Agent Progress Sync Reminder**: Enhanced prompts to remind agents to update task status using `update_task` tool

### Changed
- Converted prompt text from Chinese to English for consistency

### Fixed
- Task priority is now properly utilized in the UI

## [0.1.0] - 2026-02-10

### Added
- Initial release with Web UI and Kanban board
- MCP server with full tool support (projects, tasks, tags)
- Local JSON file storage
- Auto browser open functionality
- Bilingual README (English/Chinese)
