/**
 * Service layer type definitions
 * Provides unified result types and service interfaces
 */

import type { ProjectStorage } from '../storage/index.js';
import type { Task, Tag, TaskStatus, TaskPriority } from '../models/index.js';

// ============================================================================
// Result Types
// ============================================================================

/**
 * Error codes for service operations
 */
export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_ERROR'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

/**
 * Service result type - discriminated union for success/failure
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode };

// ============================================================================
// Task Service Types
// ============================================================================

export interface CreateTaskData {
  title: string;
  description: string;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string | null;
  assignee?: string | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string | null;
  assignee?: string | null;
}

export interface BatchUpdateTaskData {
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  tagOperation?: 'add' | 'remove' | 'replace';
}

export interface BatchUpdateResult {
  updatedTasks: Task[];
  updatedCount: number;
  notFoundIds?: string[];
}

// ============================================================================
// Tag Service Types
// ============================================================================

export interface CreateTagData {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
  description?: string;
}

export interface DeleteTagResult {
  deleted: true;
  tag: Tag;
  tasksUpdated: number;
}

export interface TasksByTagResult {
  tag: Tag;
  tasks: Task[];
  count: number;
}

// ============================================================================
// Service Context
// ============================================================================

/**
 * Service context for dependency injection
 */
export interface ServiceContext {
  storage: ProjectStorage;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Task Service interface
 */
export interface ITaskService {
  create(projectId: string, data: CreateTaskData): Promise<ServiceResult<Task>>;
  get(projectId: string, taskId: string): Promise<ServiceResult<Task>>;
  update(projectId: string, taskId: string, data: UpdateTaskData): Promise<ServiceResult<Task>>;
  delete(projectId: string, taskId: string): Promise<ServiceResult<void>>;
  list(filters?: {
    projectId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    tags?: string[];
    assignee?: string;
    dueBefore?: string;
    dueAfter?: string;
    includeCompleted?: boolean;
  }): Promise<ServiceResult<Task[]>>;
  batchUpdate(
    projectId: string,
    taskIds: string[],
    data: BatchUpdateTaskData
  ): Promise<ServiceResult<BatchUpdateResult>>;
}

/**
 * Tag Service interface
 */
export interface ITagService {
  create(projectId: string, data: CreateTagData): Promise<ServiceResult<Tag>>;
  list(projectId: string): Promise<ServiceResult<Tag[]>>;
  update(projectId: string, tagId: string, data: UpdateTagData): Promise<ServiceResult<Tag>>;
  delete(projectId: string, tagId: string): Promise<ServiceResult<DeleteTagResult>>;
  getTasksByTag(projectId: string, tagName: string): Promise<ServiceResult<TasksByTagResult>>;
}
