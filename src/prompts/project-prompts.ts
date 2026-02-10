import type {
  Prompt,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Prompt definitions for roadmap projects
 */
export const projectPrompts: Prompt[] = [
  {
    name: 'projectPlanningPrompt',
    description: 'Helps users plan a new project with structured guidance',
    arguments: [
      {
        name: 'projectType',
        description: 'Type of project (roadmap, skill-tree, kanban)',
        required: false,
      },
    ],
  },
  {
    name: 'taskManagementPrompt',
    description: 'Helps users manage and organize tasks effectively',
    arguments: [
      {
        name: 'projectId',
        description: 'ID of the project to manage tasks for',
        required: false,
      },
    ],
  },
  {
    name: 'roadmapOverviewPrompt',
    description: 'Shows a comprehensive overview of the roadmap',
    arguments: [],
  },
  {
    name: 'milestoneReviewPrompt',
    description: 'Helps review and evaluate project milestones',
    arguments: [
      {
        name: 'projectId',
        description: 'ID of the project to review milestones for',
        required: false,
      },
    ],
  },
];

/**
 * Project planning prompt - helps users plan a new project
 */
export function getProjectPlanningPrompt(projectType?: string): GetPromptResult {
  const typeContext = projectType 
    ? `You are planning a ${projectType} project.` 
    : 'You are planning a new project.';

  return {
    description: 'Project Planning Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${typeContext}

I will help you plan your project step by step. Let's start by defining the key aspects:

## Step 1: Project Definition
- What is the name of your project?
- What is the main goal or objective?
- Who is the target audience or beneficiary?

## Step 2: Scope and Timeline
- What are the start and target completion dates?
- What are the major deliverables?
- What is explicitly out of scope?

## Step 3: Key Milestones
Identify 3-5 major milestones that mark significant progress:
- Milestone 1: [Name] - Target Date
- Milestone 2: [Name] - Target Date
- Milestone 3: [Name] - Target Date

## Step 4: Initial Tasks
List the first 5-10 tasks to get started:
- Task name and brief description
- Priority level (low, medium, high, critical)
- Estimated completion time

## Step 5: Resources and Tags
- What categories or tags will help organize this project?
- Are there any specific resources, tools, or people needed?

## Example
Here's a simple example for a "Learn TypeScript" skill-tree project:

**Project**: TypeScript Mastery
**Goal**: Become proficient in TypeScript for web development
**Timeline**: 3 months (Jan 1 - Mar 31)

**Milestones**:
1. Complete basic syntax (Week 2)
2. Build first TypeScript app (Week 6)
3. Master advanced types (Week 10)
4. Complete final project (Week 12)

**Initial Tasks**:
1. Set up TypeScript environment (high priority)
2. Complete "Hello World" tutorial (medium priority)
3. Study type annotations (high priority)
4. Practice with interfaces (medium priority)

Please share your project details, and I'll help you refine the plan!`,
        },
      },
    ],
  };
}

/**
 * Task management prompt - helps users manage tasks
 */
export function getTaskManagementPrompt(projectId?: string): GetPromptResult {
  const projectContext = projectId 
    ? `Managing tasks for project: ${projectId}` 
    : 'Managing tasks across all projects';

  return {
    description: 'Task Management Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${projectContext}

I'll help you manage your tasks effectively. Here are the key areas we can work on:

## Task Organization

### Current Status Review
Let's review tasks by status:
- **Todo**: Tasks waiting to be started
- **In Progress**: Tasks currently being worked on
- **Review**: Tasks completed and awaiting review
- **Done**: Completed tasks

### Priority Management
Tasks should be prioritized as:
- **Critical**: Blockers, urgent deadlines, essential functionality
- **High**: Important features, near-term deadlines
- **Medium**: Standard work, nice-to-have features
- **Low**: Backlog items, future improvements

## Task Actions

### Creating New Tasks
When creating a task, include:
- Clear, actionable title
- Detailed description with acceptance criteria
- Priority level
- Due date (if applicable)
- Assignee (if applicable)
- Relevant tags

### Updating Tasks
Common updates include:
- Status changes (todo → in progress → review → done)
- Priority adjustments
- Due date modifications
- Adding comments or notes

### Batch Operations
You can perform actions on multiple tasks:
- Update status for multiple tasks
- Reassign tasks
- Apply tags to multiple tasks

## Best Practices

1. **Keep tasks small**: Break large work into manageable pieces
2. **Write clear titles**: Use action verbs (e.g., "Implement", "Fix", "Update")
3. **Set realistic due dates**: Account for dependencies and blockers
4. **Review regularly**: Check overdue tasks and adjust priorities
5. **Use tags consistently**: Create a tagging convention and stick to it

## Example Workflow

**Morning Routine**:
1. Review overdue tasks
2. Check what's in progress
3. Prioritize today's work
4. Update task statuses

**Weekly Review**:
1. Review completed tasks
2. Assess progress toward milestones
3. Reprioritize upcoming work
4. Identify blockers

What would you like to work on? You can:
- View tasks by status
- Create new tasks
- Update existing tasks
- Search for specific tasks
- Get an overview of task distribution`,
        },
      },
    ],
  };
}

/**
 * Roadmap overview prompt - shows comprehensive roadmap overview
 */
export function getRoadmapOverviewPrompt(): GetPromptResult {
  return {
    description: 'Roadmap Overview Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Welcome to your Roadmap Overview!

I'll help you get a comprehensive view of all your projects and their progress. Here's what we can explore:

## Dashboard Overview

### Project Summary
- Total number of projects
- Projects by status (active, completed, archived)
- Projects by type (roadmap, skill-tree, kanban)
- Recently updated projects

### Task Overview
- Total tasks across all projects
- Tasks by status (todo, in progress, review, done)
- Overdue tasks requiring attention
- Tasks by priority level

### Progress Metrics
- Overall completion percentage
- Milestones completed vs. total
- Average tasks per project
- Upcoming deadlines

## Project Health Indicators

### Green (Healthy)
- On track with timeline
- No overdue critical tasks
- Regular progress being made

### Yellow (Attention Needed)
- Some tasks overdue but not critical
- Approaching deadline
- Tasks stuck in review

### Red (Requires Action)
- Critical tasks overdue
- Missed milestones
- No recent progress

## Navigation Guide

### Viewing Projects
- List all projects with key metrics
- Filter by status or type
- Sort by various criteria (updated, created, name)

### Drilling Down
- View specific project details
- See all tasks for a project
- Check milestone progress
- Review tag usage

### Taking Action
- Identify projects needing attention
- Find overdue tasks
- Review completed work
- Plan upcoming work

## Example Queries

**"Show me all active projects"**
Lists projects with status = active, sorted by most recently updated

**"What tasks are overdue?"**
Shows all tasks where due date < today and status != done

**"Which projects are at risk?"**
Identifies projects with overdue critical/high priority tasks

**"Show my progress this week"**
Displays tasks completed in the last 7 days

## Quick Actions

1. **Review Overdue Items**: Check what needs immediate attention
2. **Celebrate Wins**: Review recently completed tasks
3. **Plan Ahead**: Look at upcoming milestones and deadlines
4. **Clean Up**: Archive completed projects

What would you like to see first? I can show you:
- A summary of all projects
- Overdue tasks across all projects
- Progress statistics
- Specific project details`,
        },
      },
    ],
  };
}

/**
 * Milestone review prompt - helps review and evaluate milestones
 */
export function getMilestoneReviewPrompt(projectId?: string): GetPromptResult {
  const projectContext = projectId 
    ? `Reviewing milestones for project: ${projectId}` 
    : 'Reviewing milestones across all projects';

  return {
    description: 'Milestone Review Assistant',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `${projectContext}

I'll help you review and evaluate your project milestones. Milestones are key checkpoints that help track significant progress.

## Milestone Review Framework

### What is a Milestone?
A milestone represents a significant achievement or checkpoint in your project:
- Major deliverable completion
- Phase transition
- Key decision point
- External deadline

### Milestone Status Types
- **Not Started**: Target date in future, no work completed
- **In Progress**: Work ongoing toward milestone
- **At Risk**: May not meet target date
- **Completed**: Achieved and marked complete
- **Missed**: Target date passed without completion

## Review Checklist

### For Each Milestone, Ask:

1. **Relevance**
   - Is this milestone still relevant to project goals?
   - Does it represent meaningful progress?
   - Are the success criteria clear?

2. **Timeline**
   - Is the target date realistic?
   - Are there dependencies blocking progress?
   - Do we need to adjust the date?

3. **Progress**
   - What percentage complete is this milestone?
   - Which tasks contribute to this milestone?
   - Are there blockers or risks?

4. **Completion Criteria**
   - What defines "complete" for this milestone?
   - Are there acceptance criteria?
   - Who needs to sign off?

## Milestone Management Actions

### Creating Milestones
Best practices for new milestones:
- Use clear, descriptive names
- Set realistic target dates
- Define completion criteria
- Link related tasks

### Updating Milestones
Common updates during review:
- Adjust target dates based on progress
- Update descriptions to reflect scope changes
- Mark completed when criteria met
- Archive obsolete milestones

### Tracking Progress
Ways to monitor milestone health:
- Percentage of linked tasks complete
- Time remaining vs. work remaining
- Risk assessment (low/medium/high)
- Dependency status

## Example Milestone Review

**Project**: Website Redesign
**Milestone**: Design Phase Complete
**Target Date**: March 15, 2024

**Review Questions**:
- ✓ Relevance: Still critical path item
- ⚠ Timeline: 5 days remaining, 60% complete
- Progress: 3 of 5 design tasks done
- Risks: User research taking longer than expected

**Decision**: Extend target date by 3 days, add resources to user research

## Review Schedule Recommendations

### Weekly
- Quick check of upcoming milestones (next 2 weeks)
- Identify any at-risk items

### Monthly
- Full review of all active milestones
- Adjust timelines as needed
- Celebrate completed milestones

### Quarterly
- Strategic review of milestone alignment
- Archive completed project milestones
- Plan next quarter's milestones

## Metrics to Track

- **Milestone Completion Rate**: % of milestones completed on time
- **Average Delay**: How often and by how much dates slip
- **Scope Changes**: Number of milestones added/removed
- **Predictability**: Variance between planned and actual dates

What would you like to do?
- Review milestones for a specific project
- Identify at-risk milestones
- Plan new milestones
- Analyze milestone performance
- Update existing milestones`,
        },
      },
    ],
  };
}

/**
 * Get prompt by name
 */
export function getPromptByName(name: string, args?: Record<string, string>): GetPromptResult | null {
  switch (name) {
    case 'projectPlanningPrompt':
      return getProjectPlanningPrompt(args?.projectType);
    case 'taskManagementPrompt':
      return getTaskManagementPrompt(args?.projectId);
    case 'roadmapOverviewPrompt':
      return getRoadmapOverviewPrompt();
    case 'milestoneReviewPrompt':
      return getMilestoneReviewPrompt(args?.projectId);
    default:
      return null;
  }
}

/**
 * Get all available prompts
 */
export function getAllPrompts(): Prompt[] {
  return projectPrompts;
}
