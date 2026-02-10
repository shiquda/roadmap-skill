import { z } from 'zod';
import { storage } from '../storage/index.js';
import type { Task } from '../models/index.js';

const TaskStatusEnum = z.enum(['todo', 'in-progress', 'review', 'done']);
const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const createTaskTool = {
  name: 'create_task',
  description: 'Create a new task in a project',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    title: z.string().min(1, 'Task title is required'),
    description: z.string(),
    priority: TaskPriorityEnum.default('medium'),
    tags: z.array(z.string()).default([]),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    assignee: z.string().optional(),
  }),
  async execute(input: {
    projectId: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    dueDate?: string;
    assignee?: string;
  }) {
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      const now = new Date().toISOString();
      const task: Task = {
        id: generateTaskId(),
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        status: 'todo',
        priority: input.priority,
        tags: input.tags,
        dueDate: input.dueDate ?? null,
        assignee: input.assignee ?? null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };

      projectData.tasks.push(task);
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(input.projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
      };
    }
  },
};

export const listTasksTool = {
  name: 'list_tasks',
  description: 'List tasks with optional filters',
  inputSchema: z.object({
    projectId: z.string().optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    tags: z.array(z.string()).optional(),
    assignee: z.string().optional(),
    dueBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  async execute(input: {
    projectId?: string;
    status?: 'todo' | 'in-progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    assignee?: string;
    dueBefore?: string;
    dueAfter?: string;
  }) {
    try {
      const results = await storage.searchTasks({
        projectId: input.projectId,
        status: input.status,
        priority: input.priority,
        tags: input.tags,
        assignee: input.assignee,
        dueBefore: input.dueBefore,
        dueAfter: input.dueAfter,
      });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tasks',
      };
    }
  },
};

export const getTaskTool = {
  name: 'get_task',
  description: 'Get a specific task by project ID and task ID',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    taskId: z.string().min(1, 'Task ID is required'),
  }),
  async execute(input: { projectId: string; taskId: string }) {
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      const task = projectData.tasks.find((t) => t.id === input.taskId);
      if (!task) {
        return {
          success: false,
          error: `Task with ID '${input.taskId}' not found in project '${input.projectId}'`,
        };
      }

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task',
      };
    }
  },
};

export const updateTaskTool = {
  name: 'update_task',
  description: 'Update an existing task',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    taskId: z.string().min(1, 'Task ID is required'),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    tags: z.array(z.string()).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    assignee: z.string().optional().nullable(),
  }),
  async execute(input: {
    projectId: string;
    taskId: string;
    title?: string;
    description?: string;
    status?: 'todo' | 'in-progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    dueDate?: string | null;
    assignee?: string | null;
  }) {
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      const taskIndex = projectData.tasks.findIndex((t) => t.id === input.taskId);
      if (taskIndex === -1) {
        return {
          success: false,
          error: `Task with ID '${input.taskId}' not found in project '${input.projectId}'`,
        };
      }

      const { projectId, taskId, ...updateData } = input;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'At least one field to update is required',
        };
      }

      const now = new Date().toISOString();
      const existingTask = projectData.tasks[taskIndex];

      const updatedTask: Task = {
        ...existingTask,
        ...updateData,
        id: existingTask.id,
        projectId: existingTask.projectId,
        createdAt: existingTask.createdAt,
        updatedAt: now,
        completedAt: updateData.status === 'done' && existingTask.status !== 'done'
          ? now
          : updateData.status && updateData.status !== 'done'
            ? null
            : existingTask.completedAt,
      };

      projectData.tasks[taskIndex] = updatedTask;
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(input.projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: updatedTask,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task',
      };
    }
  },
};

export const deleteTaskTool = {
  name: 'delete_task',
  description: 'Delete a task by project ID and task ID',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    taskId: z.string().min(1, 'Task ID is required'),
  }),
  async execute(input: { projectId: string; taskId: string }) {
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      const taskIndex = projectData.tasks.findIndex((t) => t.id === input.taskId);
      if (taskIndex === -1) {
        return {
          success: false,
          error: `Task with ID '${input.taskId}' not found in project '${input.projectId}'`,
        };
      }

      const now = new Date().toISOString();
      projectData.tasks.splice(taskIndex, 1);
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(input.projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete task',
      };
    }
  },
};

export const batchUpdateTasksTool = {
  name: 'batch_update_tasks',
  description: 'Update multiple tasks at once',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    tags: z.array(z.string()).optional(),
    tagOperation: z.enum(['add', 'remove', 'replace']).default('replace'),
  }),
  async execute(input: {
    projectId: string;
    taskIds: string[];
    status?: 'todo' | 'in-progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    tagOperation?: 'add' | 'remove' | 'replace';
  }) {
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      const now = new Date().toISOString();
      const updatedTasks: Task[] = [];
      const notFoundIds: string[] = [];

      for (const taskId of input.taskIds) {
        const taskIndex = projectData.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) {
          notFoundIds.push(taskId);
          continue;
        }

        const existingTask = projectData.tasks[taskIndex];
        let updatedTags = existingTask.tags;

        if (input.tags && input.tags.length > 0) {
          const existingTags = existingTask.tags || [];
          switch (input.tagOperation) {
            case 'add':
              updatedTags = [...new Set([...existingTags, ...input.tags])];
              break;
            case 'remove':
              updatedTags = existingTags.filter((tag) => !input.tags!.includes(tag));
              break;
            case 'replace':
            default:
              updatedTags = input.tags;
              break;
          }
        }

        const updatedTask: Task = {
          ...existingTask,
          ...(input.status && { status: input.status }),
          ...(input.priority && { priority: input.priority }),
          tags: updatedTags,
          updatedAt: now,
          ...(input.status === 'done' && existingTask.status !== 'done' && { completedAt: now }),
          ...(input.status && input.status !== 'done' && { completedAt: null }),
        };

        projectData.tasks[taskIndex] = updatedTask;
        updatedTasks.push(updatedTask);
      }

      if (updatedTasks.length === 0) {
        return {
          success: false,
          error: 'No tasks were found to update',
          notFoundIds,
        };
      }

      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(input.projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: {
          updatedTasks,
          updatedCount: updatedTasks.length,
          notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch update tasks',
      };
    }
  },
};
