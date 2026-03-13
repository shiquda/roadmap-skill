/**
 * Service layer type definitions
 * Provides unified result types and service interfaces
 */

import type { ProjectStorage } from '../storage/index.js';
import type {
  Task,
  Tag,
  TaskStatus,
  TaskPriority,
  DependencyView,
  DependencyViewAnalysis,
} from '../models/index.js';

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

export interface CreateDependencyViewData {
  name: string;
  description: string;
  dimension?: string | null;
}

export interface UpdateDependencyViewData {
  name?: string;
  description?: string;
  dimension?: string | null;
}

export interface AddDependencyViewNodeData {
  taskId: string;
  x?: number;
  y?: number;
  collapsed?: boolean;
  note?: string | null;
}

export interface UpdateDependencyViewNodeData {
  x?: number;
  y?: number;
  collapsed?: boolean;
  note?: string | null;
}

export interface BatchUpdateDependencyViewNodesData {
  nodes: Array<{
    taskId: string;
    x?: number;
    y?: number;
    collapsed?: boolean;
    note?: string | null;
  }>;
}

export interface AddDependencyViewEdgeData {
  fromTaskId: string;
  toTaskId: string;
}

export interface UpdateDependencyViewEdgeData {
  fromTaskId?: string;
  toTaskId?: string;
}

// ============================================================================
// Tag Service Types
// ============================================================================

export interface CreateTagData {
  name: string;
  color?: string;
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

export interface IDependencyViewService {
  create(projectId: string, data: CreateDependencyViewData): Promise<ServiceResult<DependencyView>>;
  list(projectId: string): Promise<ServiceResult<DependencyView[]>>;
  get(projectId: string, viewId: string): Promise<ServiceResult<DependencyView>>;
  update(
    projectId: string,
    viewId: string,
    data: UpdateDependencyViewData
  ): Promise<ServiceResult<DependencyView>>;
  delete(projectId: string, viewId: string): Promise<ServiceResult<void>>;
  addNode(
    projectId: string,
    viewId: string,
    data: AddDependencyViewNodeData
  ): Promise<ServiceResult<DependencyView>>;
  updateNode(
    projectId: string,
    viewId: string,
    taskId: string,
    data: UpdateDependencyViewNodeData
  ): Promise<ServiceResult<DependencyView>>;
  batchUpdateNodes(
    projectId: string,
    viewId: string,
    data: BatchUpdateDependencyViewNodesData
  ): Promise<ServiceResult<DependencyView>>;
  removeNode(projectId: string, viewId: string, taskId: string): Promise<ServiceResult<DependencyView>>;
  addEdge(
    projectId: string,
    viewId: string,
    data: AddDependencyViewEdgeData
  ): Promise<ServiceResult<DependencyView>>;
  updateEdge(
    projectId: string,
    viewId: string,
    edgeId: string,
    data: UpdateDependencyViewEdgeData
  ): Promise<ServiceResult<DependencyView>>;
  removeEdge(projectId: string, viewId: string, edgeId: string): Promise<ServiceResult<DependencyView>>;
  analyze(projectId: string, viewId: string): Promise<ServiceResult<DependencyViewAnalysis>>;
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
