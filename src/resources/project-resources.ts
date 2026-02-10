import type {
  Resource,
  TextResourceContents,
} from '@modelcontextprotocol/sdk/types.js';
import { storage } from '../storage/index.js';

/**
 * Resource definitions for roadmap projects
 */
export const projectResources: Resource[] = [
  {
    uri: 'roadmap://projects',
    name: 'Project List',
    mimeType: 'application/json',
    description: 'Returns a list of all projects with basic metadata',
  },
  {
    uri: 'roadmap://project/{projectId}',
    name: 'Project Details',
    mimeType: 'application/json',
    description: 'Returns detailed information about a specific project including tasks, milestones, and tags',
  },
  {
    uri: 'roadmap://project/{projectId}/tasks',
    name: 'Project Tasks',
    mimeType: 'application/json',
    description: 'Returns all tasks for a specific project',
  },
  {
    uri: 'roadmap://project/{projectId}/progress',
    name: 'Project Progress',
    mimeType: 'application/json',
    description: 'Returns progress statistics for a specific project',
  },
];

/**
 * Resource URI patterns for matching
 */
const RESOURCE_PATTERNS = {
  projectList: /^roadmap:\/\/projects$/,
  projectDetails: /^roadmap:\/\/project\/([^/]+)$/,
  projectTasks: /^roadmap:\/\/project\/([^/]+)\/tasks$/,
  projectProgress: /^roadmap:\/\/project\/([^/]+)\/progress$/,
};

/**
 * Handle resource requests
 * @param uri - The resource URI
 * @returns Resource contents or null if not found
 */
export async function handleResourceRequest(
  uri: string
): Promise<TextResourceContents | null> {
  // Project List: roadmap://projects
  if (RESOURCE_PATTERNS.projectList.test(uri)) {
    return await getProjectListResource(uri);
  }

  // Project Details: roadmap://project/{projectId}
  const projectDetailsMatch = uri.match(RESOURCE_PATTERNS.projectDetails);
  if (projectDetailsMatch && !uri.includes('/tasks') && !uri.includes('/progress')) {
    const projectId = projectDetailsMatch[1];
    return await getProjectDetailsResource(uri, projectId);
  }

  // Project Tasks: roadmap://project/{projectId}/tasks
  const projectTasksMatch = uri.match(RESOURCE_PATTERNS.projectTasks);
  if (projectTasksMatch) {
    const projectId = projectTasksMatch[1];
    return await getProjectTasksResource(uri, projectId);
  }

  // Project Progress: roadmap://project/{projectId}/progress
  const projectProgressMatch = uri.match(RESOURCE_PATTERNS.projectProgress);
  if (projectProgressMatch) {
    const projectId = projectProgressMatch[1];
    return await getProjectProgressResource(uri, projectId);
  }

  return null;
}

/**
 * Get project list resource
 */
async function getProjectListResource(uri: string): Promise<TextResourceContents> {
  const projects = await storage.listProjects();

  const data = {
    projects: projects.map(p => ({
      id: p.project.id,
      name: p.project.name,
      description: p.project.description,
      status: p.project.status,
      projectType: p.project.projectType,
      taskCount: p.taskCount,
      milestoneCount: p.milestoneCount,
      updatedAt: p.project.updatedAt,
    })),
    totalCount: projects.length,
  };

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(data, null, 2),
  };
}

/**
 * Get project details resource
 */
async function getProjectDetailsResource(
  uri: string,
  projectId: string
): Promise<TextResourceContents | null> {
  const projectData = await storage.readProject(projectId);

  if (!projectData) {
    return null;
  }

  const data = {
    project: projectData.project,
    milestones: projectData.milestones,
    tasks: projectData.tasks,
    tags: projectData.tags,
    stats: {
      taskCount: projectData.tasks.length,
      milestoneCount: projectData.milestones.length,
      tagCount: projectData.tags.length,
      completedTasks: projectData.tasks.filter(t => t.status === 'done').length,
      inProgressTasks: projectData.tasks.filter(t => t.status === 'in-progress').length,
    },
  };

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(data, null, 2),
  };
}

/**
 * Get project tasks resource
 */
async function getProjectTasksResource(
  uri: string,
  projectId: string
): Promise<TextResourceContents | null> {
  const projectData = await storage.readProject(projectId);

  if (!projectData) {
    return null;
  }

  const tasksByStatus = {
    todo: projectData.tasks.filter(t => t.status === 'todo'),
    inProgress: projectData.tasks.filter(t => t.status === 'in-progress'),
    review: projectData.tasks.filter(t => t.status === 'review'),
    done: projectData.tasks.filter(t => t.status === 'done'),
  };

  const data = {
    projectId,
    projectName: projectData.project.name,
    tasks: projectData.tasks,
    tasksByStatus,
    summary: {
      total: projectData.tasks.length,
      todo: tasksByStatus.todo.length,
      inProgress: tasksByStatus.inProgress.length,
      review: tasksByStatus.review.length,
      done: tasksByStatus.done.length,
    },
  };

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(data, null, 2),
  };
}

/**
 * Get project progress resource
 */
async function getProjectProgressResource(
  uri: string,
  projectId: string
): Promise<TextResourceContents | null> {
  const projectData = await storage.readProject(projectId);

  if (!projectData) {
    return null;
  }

  const tasks = projectData.tasks;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const reviewTasks = tasks.filter(t => t.status === 'review').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const milestones = projectData.milestones;
  const completedMilestones = milestones.filter(m => m.completedAt !== null).length;
  const milestoneProgress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  // Calculate overdue tasks
  const now = new Date().toISOString();
  const overdueTasks = tasks.filter(t => 
    t.dueDate && 
    t.dueDate < now && 
    t.status !== 'done'
  );

  // Priority breakdown
  const priorityBreakdown = {
    critical: tasks.filter(t => t.priority === 'critical').length,
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  const data = {
    projectId,
    projectName: projectData.project.name,
    projectStatus: projectData.project.status,
    dates: {
      startDate: projectData.project.startDate,
      targetDate: projectData.project.targetDate,
      daysRemaining: calculateDaysRemaining(projectData.project.targetDate),
    },
    taskProgress: {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      review: reviewTasks,
      todo: todoTasks,
      completionPercentage,
    },
    milestoneProgress: {
      total: milestones.length,
      completed: completedMilestones,
      percentage: milestoneProgress,
    },
    overdueTasks: {
      count: overdueTasks.length,
      tasks: overdueTasks.map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
      })),
    },
    priorityBreakdown,
    lastUpdated: projectData.project.updatedAt,
  };

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(data, null, 2),
  };
}

/**
 * Calculate days remaining until target date
 */
function calculateDaysRemaining(targetDate: string): number | null {
  const target = new Date(targetDate);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
}

/**
 * Get all available resources
 */
export function getAllResources(): Resource[] {
  return projectResources;
}
