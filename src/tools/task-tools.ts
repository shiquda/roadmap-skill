import { z } from 'zod';
import { TaskService } from '../services/index.js';
import { storage } from '../storage/index.js';

const TaskStatusEnum = z.enum(['todo', 'in-progress', 'review', 'done']);
const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

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
    const result = await TaskService.create(input.projectId, {
      title: input.title,
      description: input.description,
      priority: input.priority,
      tags: input.tags,
      dueDate: input.dueDate,
      assignee: input.assignee,
    });

    return result;
  },
};

export const listTasksTool = {
  name: 'list_tasks',
  description: 'List tasks with optional filters. By default, completed (done) tasks are excluded. Set includeCompleted=true to include them.',
  inputSchema: z.object({
    projectId: z.string().optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    tags: z.array(z.string()).optional(),
    assignee: z.string().optional(),
    dueBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    includeCompleted: z.boolean().optional(),
  }),
  async execute(input: {
    projectId?: string;
    status?: 'todo' | 'in-progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    assignee?: string;
    dueBefore?: string;
    dueAfter?: string;
    includeCompleted?: boolean;
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
        includeCompleted: input.includeCompleted,
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
    const result = await TaskService.get(input.projectId, input.taskId);
    return result;
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
    const { projectId, taskId, ...updateData } = input;

    const result = await TaskService.update(projectId, taskId, updateData);
    return result;
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
    const result = await TaskService.delete(input.projectId, input.taskId);

    // 保持向后兼容：将 data: undefined 转换为 { deleted: true }
    if (result.success) {
      return {
        success: true,
        data: { deleted: true },
      };
    }

    return result;
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
    const { projectId, taskIds, tagOperation, ...restData } = input;

    const result = await TaskService.batchUpdate(projectId, taskIds, {
      ...restData,
      tagOperation,
    });

    return result;
  },
};
