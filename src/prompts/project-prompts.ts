import type {
  Prompt,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Curated Prompts - Help Agents use Roadmap Skill more intelligently
 */
export const projectPrompts: Prompt[] = [
  {
    name: 'suggest-tasks',
    description: 'Intelligently recommend the next priority tasks based on urgency, due dates, and project status',
    arguments: [
      {
        name: 'projectId',
        description: 'Specific project ID (optional; if not provided, auto-detect from current context or analyze all projects)',
        required: false,
      },
      {
        name: 'limit',
        description: 'Number of tasks to recommend (default: 3)',
        required: false,
      },
    ],
  },
  {
    name: 'auto-prioritize',
    description: 'Automatically analyze tasks and intelligently adjust priorities, considering due dates, dependencies, and project importance',
    arguments: [
      {
        name: 'projectId',
        description: 'Specific project ID (optional; if not provided, auto-detect from current context or analyze all projects)',
        required: false,
      },
    ],
  },
  {
    name: 'add-task-details',
    description: 'Intelligently enhance task details, including description, acceptance criteria, subtasks, and required resources',
    arguments: [
      {
        name: 'taskId',
        description: 'Task ID to be enhanced',
        required: true,
      },
    ],
  },
  {
    name: 'quick-capture',
    description: 'Quickly capture ideas/tasks, auto-categorize and suggest priorities',
    arguments: [
      {
        name: 'idea',
        description: 'Idea or task description to be captured',
        required: true,
      },
      {
        name: 'projectId',
        description: 'Target project ID (optional; if not provided, auto-detect from current context)',
        required: false,
      },
    ],
  },
  {
    name: 'open-web-ui',
    description: 'Open the web visualization interface for the roadmap skill',
    arguments: [
      {
        name: 'port',
        description: 'Port to run the web interface on (optional, default: 7860)',
        required: false,
      },
    ],
  },
];

/**
 * Intelligently recommend next tasks
 * Analyze all tasks and recommend optimal execution order based on priority, due dates, and dependencies
 */
export function getRecommendNextTasksPrompt(projectId?: string, limit?: string): GetPromptResult {
  const projectHint = projectId
    ? `User specified project: ${projectId}. Use this project if it exists, or inform user if not found.`
    : 'User did not specify a project. Based on the current working directory and conversation context, try to identify the most relevant project. If a clear match exists, focus on that project; otherwise, analyze all active projects';
  const taskLimit = limit ? parseInt(limit, 10) : 3;

  return {
    description: 'Intelligent Task Recommendation Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${projectHint}, please recommend the ${taskLimit} tasks I should prioritize next.

## Recommendation Logic (sorted by priority):

### 1. Urgent and Important (Critical priority + Near due date)
- Critical tasks due today or tomorrow
- Overdue high-priority tasks

### 2. High-Value Tasks (High priority + Clear due date)
- High priority tasks due this week
- Critical path tasks blocking other work

### 3. Quick Wins (Medium priority + Short estimated time)
- Medium tasks completable in 1-2 hours
- Tasks that can significantly boost project progress

### 4. Planned Work
- Tasks marked "in-progress" but not yet completed
- Normal priority tasks due soon

## Please perform the following steps:

1. **List all pending tasks** (status = todo or in-progress)
2. **Filter high-priority tasks**: critical and high
3. **Check due dates**: Identify tasks due soon or overdue
4. **Analyze blocking relationships**: Identify tasks blocking others
5. **Generate recommendation list**: Provide ${taskLimit} tasks to prioritize with reasons

## Output Format:

### Immediate Action (Critical)
1. **Task Name** (Project Name)
   - Reason: [Why this task is most urgent]
   - Suggested Action: [What specifically to do]

### Today's Focus (High)
2. **Task Name** (Project Name)
   - Reason: [Why this task is important]
   - Suggested Action: [What specifically to do]

### Follow-up
3. **Task Name** (Project Name)
   - Reason: [Why this should be done next]
   - Suggested Action: [What specifically to do]

Please use the list_tasks tool to fetch task data, then provide intelligent recommendations.

## Important Reminder
When you start working on recommended tasks, please:
1. Use update_task to set task status to in-progress
2. After completing the task, use update_task to set status to done
3. If blocked or have issues, document in description and update status to review

Keep task status synchronized with actual progress!`,
        },
      },
    ],
  };
}

/**
 * Automatic Priority Optimization
 * Automatically adjust priorities based on due dates, project progress, and task dependencies
 */
export function getAutoPrioritizePrompt(projectId?: string): GetPromptResult {
  const projectHint = projectId
    ? `User specified project: ${projectId}. Use this project if it exists, or inform user if not found.`
    : 'User did not specify a project. Based on the current working directory and conversation context, try to identify the most relevant project. If a clear match exists, focus on that project; otherwise, analyze all active projects';

  return {
    description: 'Intelligent Priority Optimization Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${projectHint}, please automatically analyze and adjust priorities.

## Priority Adjustment Rules:

### Conditions to Upgrade to Critical:
- [ ] Due within 48 hours and not completed
- [ ] Blocking other high/critical tasks
- [ ] On project critical path and behind schedule
- [ ] Has external dependencies (e.g., clients, partners) and time is tight

### Conditions to Upgrade to High:
- [ ] Due within 1 week
- [ ] Prerequisite for important milestone
- [ ] Stuck in "in-progress" state for too long (over 3 days)
- [ ] Affects work of multiple team members

### Conditions to Downgrade to Medium/Low:
- [ ] Due date is far away (>2 weeks) and no dependencies
- [ ] "Nice to have" feature rather than core functionality
- [ ] Not needed in current phase, can be postponed

### Other Considerations:
- **Overall project progress**: Tasks for behind-schedule projects should be prioritized higher
- **Resource availability**: If resources are tight, focus on highest priority
- **Risk factors**: High-risk tasks should be addressed earlier

## Please perform the following steps:

1. **Get all tasks**: Use list_tasks to fetch task list
2. **Analyze each task**:
   - Check gap between due date and current date
   - Identify task dependency relationships
   - Evaluate overall project health
3. **Generate adjustment suggestions**: List tasks needing priority changes with reasons
4. **Batch update**: Use batch_update_tasks to execute priority adjustments immediately — no confirmation needed

## Output Format:

### Suggested Upgrade to Critical
| Task | Current Priority | Suggested Priority | Reason |
|------|-----------------|-------------------|--------|
| XXX | high → critical | Due tomorrow |

### Suggested Upgrade to High
| Task | Current Priority | Suggested Priority | Reason |
|------|-----------------|-------------------|--------|
| XXX | medium → high | Blocking follow-up tasks |

### Suggested Downgrade
| Task | Current Priority | Suggested Priority | Reason |
|------|-----------------|-------------------|--------|
| XXX | high → medium | Can be postponed |

### Keep Unchanged (Priorities are reasonable)
- List tasks with reasonable priority settings

Please provide analysis results and immediately execute batch_update_tasks to apply the priority adjustments — no confirmation needed.`,
        },
      },
    ],
  };
}

/**
 * Intelligent Task Detail Enhancement
 * Auto-complete descriptions, acceptance criteria, etc. based on task title and context
 */
export function getEnhanceTaskDetailsPrompt(taskId: string): GetPromptResult {
  return {
    description: 'Task Detail Enhancement Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please help me enhance the details for task ${taskId}.

## Enhancement Content:

### 1. Detailed Description
- Specific content and background of the task
- Why this task needs to be done
- Expected business or technical value

### 2. Acceptance Criteria (Definition of Done)
List clear completion standards, for example:
- [ ] Feature implemented and locally tested
- [ ] Code passes Code Review
- [ ] Related documentation updated
- [ ] Unit test coverage > 80%

### 3. Technical/Implementation Details
- Tech stack or modules involved
- Files that may need modification
- Potential challenges or considerations

### 4. Related Resources
- Related documentation links
- Reference implementations or example code
- People to consult

### 5. Subtask Suggestions (if needed)
If the task is complex, suggest breaking it down:
- Subtask 1: ...
- Subtask 2: ...
- Subtask 3: ...

## Please perform the following steps:

1. **Get task info**: Use get_task to view current task details
2. **Get project context**: Use get_project to understand project background
3. **Analyze task type**:
   - If development task: Add technical details, code locations
   - If design task: Add design specs, review criteria
   - If documentation task: Add doc structure, references
   - If testing task: Add test scenarios, coverage scope
4. **Apply enhancement**: Use update_task to update task description immediately — no confirmation needed

## Updated task should include:

\`\`\`
## Background
[Task background and purpose]

## Acceptance Criteria
- [ ] [Standard 1]
- [ ] [Standard 2]
- [ ] [Standard 3]

## Technical Details
- Modules: [module name]
- Key files: [file path]
- Notes: [important reminders]

## Related Resources
- Documentation: [link]
- References: [link]
\`\`\`

Please fetch task info and immediately use update_task to apply the enhanced details — no confirmation needed.`,
        },
      },
    ],
  };
}

/**
 * Quick Idea Capture
 * Auto-categorize, suggest priorities, recommend projects
 */
export function getQuickCapturePrompt(idea: string, projectId?: string): GetPromptResult {
  const projectContext = projectId
    ? `User specified project: ${projectId}. Use this project if it exists, or inform user if not found.`
    : 'User did not specify a project. Based on the current working directory and conversation context, try to identify the most relevant project. If a clear match exists, use that project; otherwise, analyze all active projects and select the best match';

  return {
    description: 'Quick Capture Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to quickly capture an idea/task: "${idea}"

${projectContext}

## Please complete the following steps immediately:

### 1. Task Information Extraction
Extract from description:
- **Task Title**: Concise and clear title (start with verb)
- **Task Description**: Add context and details
- **Task Type**: bug / feature / refactor / docs / chore
- **Estimated Priority**: critical / high / medium / low (based on urgency in description)

### 2. Project Selection (if no project specified)
- List all active projects
- Analyze which project the task content is most relevant to
- Select the most suitable project automatically

### 3. Tag Suggestions
Suggest relevant tags:
- Type tags: bug, feature, refactor, docs
- Priority tags: urgent, important
- Domain tags: frontend, backend, design, testing (if applicable)

### 4. Create Task
Use create_task to create the task immediately — no confirmation needed.

### 5. Status
After creating, if work starts immediately, use update_task to set status to in-progress.

## Example:

**Input**: "User reported login page doesn't display correctly on mobile"

**Output**:
- Title: Fix login page mobile responsiveness issue
- Description: User reported the login page displays abnormally on mobile devices, need to check responsive layout.
- Type: Bug
- Priority: High (affects user experience)
- Suggested Tags: bug, frontend, mobile
- Recommended Project: [Recommend if there's a web project]

## Current Idea:

Idea: "${idea}"

Analyze the idea, select the best matching project, and immediately execute create_task — no confirmation needed.`,
        },
      },
    ],
  };
}

/**
 * Open Web UI
 * Launch the web visualization interface
 */
export function getOpenWebUIPrompt(port?: string): GetPromptResult {
  const portNum = port ? parseInt(port, 10) : 7860;
  return {
    description: 'Open Web Visualization Interface',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please open the roadmap-skill web interface by calling the open_web_interface tool with port ${portNum}. Do it immediately without asking for confirmation.`,
        },
      },
    ],
  };
}

/**
 * Get Prompt by name
 */
export function getPromptByName(name: string, args?: Record<string, string>): GetPromptResult | null {
  switch (name) {
    case 'suggest-tasks':
      return getRecommendNextTasksPrompt(args?.projectId, args?.limit);
    case 'auto-prioritize':
      return getAutoPrioritizePrompt(args?.projectId);
    case 'add-task-details':
      return getEnhanceTaskDetailsPrompt(args?.taskId || '');
    case 'quick-capture':
      return getQuickCapturePrompt(args?.idea || '', args?.projectId);
    case 'open-web-ui':
      return getOpenWebUIPrompt(args?.port);
    default:
      return null;
  }
}

/**
 * Get all available Prompts
 */
export function getAllPrompts(): Prompt[] {
  return projectPrompts;
}
