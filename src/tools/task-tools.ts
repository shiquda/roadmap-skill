import { z } from 'zod';
import { TaskService } from '../services/index.js';
import { storage } from '../storage/index.js';
import type { Task, TaskSummary } from '../models/index.js';

const TaskStatusEnum = z.enum(['todo', 'in-progress', 'review', 'done']);
const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

function toTaskSummary(task: Task): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    assignee: task.assignee,
    tags: task.tags,
  };
}
export const createTaskTool = {
  name: 'create_task',
  description: 'Create a new task in a project. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    title: z.string().min(1, 'Task title is required'),
    description: z.string(),
    priority: TaskPriorityEnum.default('medium'),
    tags: z.array(z.string()).default([]),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    assignee: z.string().optional(),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    dueDate?: string;
    assignee?: string;
    verbose?: boolean;
  }) {
    const result = await TaskService.create(input.projectId, {
      title: input.title,
      description: input.description,
      priority: input.priority,
      tags: input.tags,
      dueDate: input.dueDate,
      assignee: input.assignee,
    });
    if (!result.success) return result;
    return {
      success: true,
      data: input.verbose ? result.data : toTaskSummary(result.data),
    };
  },
};

export const listTasksTool = {
  name: 'list_tasks',
  description: 'List tasks with optional filters. By default, completed (done) tasks are excluded. Set includeCompleted=true to include them. Returns summaries by default; set verbose=true for full task data.',
  inputSchema: z.object({
    projectId: z.string().optional(),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    tags: z.array(z.string()).optional(),
    assignee: z.string().optional(),
    dueBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dueAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    includeCompleted: z.boolean().optional(),
    verbose: z.boolean().optional(),
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
    verbose?: boolean;
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
      const tasks = results.map((r) => r.task);
      return {
        success: true,
        data: input.verbose ? tasks : tasks.map(toTaskSummary),
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
  description: 'Update an existing task. Returns summary by default; set verbose=true for full data.',
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
    verbose: z.boolean().optional(),
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
    verbose?: boolean;
  }) {
    const { projectId, taskId, verbose, ...updateData } = input;
    const result = await TaskService.update(projectId, taskId, updateData);
    if (!result.success) return result;
    return {
      success: true,
      data: verbose ? result.data : toTaskSummary(result.data),
    };
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
  description: 'Update multiple tasks at once. Returns summaries by default; set verbose=true for full task data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
    status: TaskStatusEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    tags: z.array(z.string()).optional(),
    tagOperation: z.enum(['add', 'remove', 'replace']).default('replace'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    taskIds: string[];
    status?: 'todo' | 'in-progress' | 'review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    tagOperation?: 'add' | 'remove' | 'replace';
    verbose?: boolean;
  }) {
    const { projectId, taskIds, tagOperation, verbose, ...restData } = input;
    const result = await TaskService.batchUpdate(projectId, taskIds, {
      ...restData,
      tagOperation,
    });
    if (!result.success) return result;
    return {
      success: true,
      data: {
        updatedTasks: verbose
          ? result.data.updatedTasks
          : result.data.updatedTasks.map(toTaskSummary),
        updatedCount: result.data.updatedCount,
        notFoundIds: result.data.notFoundIds,
      },
    };
  },
};
