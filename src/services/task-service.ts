/**
 * Task Service - Unified business logic for task operations
 * Extracted from task-tools.ts to enable reuse across different interfaces
 */

import type { ProjectData, Task, TaskStatus } from '../models/index.js';
import { storage } from '../storage/index.js';
import { writeJsonFile } from '../utils/file-helpers.js';
import type {
  ServiceResult,
  CreateTaskData,
  UpdateTaskData,
  BatchUpdateTaskData,
  BatchUpdateResult,
} from './types.js';

/**
 * Generate a unique task ID
 * Format: task_${timestamp}_${random}
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate completedAt based on status change
 * - When status changes to 'done', set completedAt to current time
 * - When status changes from 'done' to other, clear completedAt
 * - Otherwise, preserve existing completedAt
 */
function calculateCompletedAt(
  currentStatus: TaskStatus,
  newStatus: TaskStatus | undefined,
  existingCompletedAt: string | null,
  now: string
): string | null {
  // Status is not being updated
  if (!newStatus) {
    return existingCompletedAt;
  }

  // Status changing to 'done'
  if (newStatus === 'done' && currentStatus !== 'done') {
    return now;
  }

  // Status changing from 'done' to something else
  if (currentStatus === 'done' && newStatus !== 'done') {
    return null;
  }

  // Status changing but not involving 'done' transition
  return existingCompletedAt;
}

function findInvalidTagIds(projectData: ProjectData, tagIds: string[]): string[] {
  const validTagIds = new Set(projectData.tags.map((tag) => tag.id));
  return tagIds.filter((tagId) => !validTagIds.has(tagId));
}

/**
 * TaskService - Business logic for task operations
 */
export const TaskService = {
  /**
   * Create a new task in a project
   * @param projectId - The project ID
   * @param data - Task creation data
   * @returns The created task or error
   */
  async create(projectId: string, data: CreateTaskData): Promise<ServiceResult<Task>> {
    try {
      const projectData = await storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const incomingTagIds = data.tags ?? [];
      const invalidTagIds = findInvalidTagIds(projectData, incomingTagIds);
      if (invalidTagIds.length > 0) {
        return {
          success: false,
          error: `Invalid tag IDs for project '${projectId}': ${invalidTagIds.join(', ')}`,
          code: 'VALIDATION_ERROR',
        };
      }

      const now = new Date().toISOString();
      const task: Task = {
        id: generateTaskId(),
        projectId,
        title: data.title,
        description: data.description,
        status: 'todo',
        priority: data.priority ?? 'medium',
        tags: incomingTagIds,
        dueDate: data.dueDate ?? null,
        assignee: data.assignee ?? null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };

      projectData.tasks.push(task);
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(projectId);
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task',
        code: 'INTERNAL_ERROR',
      };
    }
  },

  /**
   * Get a specific task by project ID and task ID
   * @param projectId - The project ID
   * @param taskId - The task ID
   * @returns The task or error
   */
  async get(projectId: string, taskId: string): Promise<ServiceResult<Task>> {
    try {
      const projectData = await storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const task = projectData.tasks.find((t) => t.id === taskId);
      if (!task) {
        return {
          success: false,
          error: `Task with ID '${taskId}' not found in project '${projectId}'`,
          code: 'NOT_FOUND',
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
        code: 'INTERNAL_ERROR',
      };
    }
  },

  /**
   * Update an existing task
   * Handles completedAt automatically based on status changes
   * @param projectId - The project ID
   * @param taskId - The task ID
   * @param data - Task update data
   * @returns The updated task or error
   */
  async update(
    projectId: string,
    taskId: string,
    data: UpdateTaskData
  ): Promise<ServiceResult<Task>> {
    try {
      const projectData = await storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const taskIndex = projectData.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        return {
          success: false,
          error: `Task with ID '${taskId}' not found in project '${projectId}'`,
          code: 'NOT_FOUND',
        };
      }

      // Check if there's anything to update
      const updateKeys = Object.keys(data);
      if (updateKeys.length === 0) {
        return {
          success: false,
          error: 'At least one field to update is required',
          code: 'VALIDATION_ERROR',
        };
      }

      if (data.tags) {
        const invalidTagIds = findInvalidTagIds(projectData, data.tags);
        if (invalidTagIds.length > 0) {
          return {
            success: false,
            error: `Invalid tag IDs for project '${projectId}': ${invalidTagIds.join(', ')}`,
            code: 'VALIDATION_ERROR',
          };
        }
      }

      const now = new Date().toISOString();
      const existingTask = projectData.tasks[taskIndex];

      // Calculate completedAt based on status change
      const completedAt = calculateCompletedAt(
        existingTask.status,
        data.status,
        existingTask.completedAt,
        now
      );

      const updatedTask: Task = {
        ...existingTask,
        ...data,
        id: existingTask.id,
        projectId: existingTask.projectId,
        createdAt: existingTask.createdAt,
        updatedAt: now,
        completedAt,
      };

      projectData.tasks[taskIndex] = updatedTask;
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(projectId);
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: updatedTask,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task',
        code: 'INTERNAL_ERROR',
      };
    }
  },

  /**
   * Delete a task by project ID and task ID
   * @param projectId - The project ID
   * @param taskId - The task ID
   * @returns Void or error
   */
  async delete(projectId: string, taskId: string): Promise<ServiceResult<void>> {
    try {
      const projectData = await storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const taskIndex = projectData.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        return {
          success: false,
          error: `Task with ID '${taskId}' not found in project '${projectId}'`,
          code: 'NOT_FOUND',
        };
      }

      const now = new Date().toISOString();
      projectData.tasks.splice(taskIndex, 1);
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(projectId);
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete task',
        code: 'INTERNAL_ERROR',
      };
    }
  },

  /**
   * List tasks with optional filters
   * @param filters - Optional filters for the search
   * @returns Array of tasks or error
   */
  async list(filters?: {
    projectId?: string;
    status?: TaskStatus;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
    assignee?: string;
    dueBefore?: string;
    dueAfter?: string;
    includeCompleted?: boolean;
  }): Promise<ServiceResult<Task[]>> {
    try {
      const results = await storage.searchTasks({
        projectId: filters?.projectId,
        status: filters?.status,
        priority: filters?.priority,
        tags: filters?.tags,
        assignee: filters?.assignee,
        dueBefore: filters?.dueBefore,
        dueAfter: filters?.dueAfter,
        includeCompleted: filters?.includeCompleted,
      });

      // Extract just the tasks from the results
      const tasks = results.map((r) => r.task);

      return {
        success: true,
        data: tasks,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tasks',
        code: 'INTERNAL_ERROR',
      };
    }
  },

  /**
   * Update multiple tasks at once
   * @param projectId - The project ID
   * @param taskIds - Array of task IDs to update
   * @param data - Batch update data
   * @returns Batch update result or error
   */
  async batchUpdate(
    projectId: string,
    taskIds: string[],
    data: BatchUpdateTaskData
  ): Promise<ServiceResult<BatchUpdateResult>> {
    try {
      const projectData = await storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const now = new Date().toISOString();
      const updatedTasks: Task[] = [];
      const notFoundIds: string[] = [];

      for (const taskId of taskIds) {
        const taskIndex = projectData.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) {
          notFoundIds.push(taskId);
          continue;
        }

        const existingTask = projectData.tasks[taskIndex];
        let updatedTags = existingTask.tags ?? [];

        if (data.tags) {
          const invalidTagIds = findInvalidTagIds(projectData, data.tags);
          if (invalidTagIds.length > 0) {
            return {
              success: false,
              error: `Invalid tag IDs for project '${projectId}': ${invalidTagIds.join(', ')}`,
              code: 'VALIDATION_ERROR',
            };
          }
        }

        // Handle tags based on tagOperation
        if (data.tags) {
          const existingTags = existingTask.tags ?? [];
          switch (data.tagOperation) {
            case 'add':
              updatedTags = [...new Set([...existingTags, ...data.tags])];
              break;
            case 'remove':
              updatedTags = existingTags.filter((tag) => !data.tags!.includes(tag));
              break;
            case 'replace':
            default:
              updatedTags = data.tags;
              break;
          }
        }

        // Calculate completedAt based on status change
        const completedAt = calculateCompletedAt(
          existingTask.status,
          data.status,
          existingTask.completedAt,
          now
        );

        const updatedTask: Task = {
          ...existingTask,
          ...(data.status && { status: data.status }),
          ...(data.priority && { priority: data.priority }),
          tags: updatedTags,
          updatedAt: now,
          completedAt,
        };

        projectData.tasks[taskIndex] = updatedTask;
        updatedTasks.push(updatedTask);
      }

      if (updatedTasks.length === 0) {
        return {
          success: false,
          error: 'No tasks were found to update',
          code: 'NOT_FOUND',
        };
      }

      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(projectId);
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
        code: 'INTERNAL_ERROR',
      };
    }
  },
};
