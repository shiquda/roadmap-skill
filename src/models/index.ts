/**
 * Data models for Roadmap Skill MCP Server
 * All dates are stored as ISO 8601 strings
 */

export type ProjectType = 'roadmap' | 'skill-tree' | 'kanban';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  name: string;
  description: string;
  projectType: ProjectType;
  status: ProjectStatus;
  startDate: string; // ISO 8601 date string
  targetDate: string; // ISO 8601 date string
  createdAt: string; // ISO 8601 datetime string
  updatedAt: string; // ISO 8601 datetime string
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[]; // Array of tag IDs
  dueDate: string | null; // ISO 8601 date string or null
  assignee: string | null;
  createdAt: string; // ISO 8601 datetime string
  updatedAt: string; // ISO 8601 datetime string
  completedAt: string | null; // ISO 8601 datetime string or null
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Hex color code (e.g., "#FF5733")
  description: string;
  createdAt: string; // ISO 8601 datetime string
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  targetDate: string; // ISO 8601 date string
  completedAt: string | null; // ISO 8601 datetime string or null
  createdAt: string; // ISO 8601 datetime string
  updatedAt: string; // ISO 8601 datetime string
}

export interface ProjectData {
  version: number;
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
  tags: Tag[];
}

// Filter types for search operations
export interface TaskSearchFilters {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  assignee?: string;
  dueBefore?: string; // ISO 8601 date string
  dueAfter?: string; // ISO 8601 date string
  searchText?: string;
  includeCompleted?: boolean; // Whether to include completed (done) tasks, default: false
}

// Input types for creating/updating entities
export interface CreateProjectInput {
  name: string;
  description: string;
  projectType: ProjectType;
  startDate: string;
  targetDate: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  projectType?: ProjectType;
  status?: ProjectStatus;
  startDate?: string;
  targetDate?: string;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string;
  assignee?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string | null;
  assignee?: string | null;
}

export interface CreateTagInput {
  projectId: string;
  name: string;
  color?: string;
  description?: string;
}

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  description: string;
  targetDate: string;
}


// Summary types for compact tool responses (verbose=false)
export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: string | null;
  tags: string[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  projectType: ProjectType;
  status: ProjectStatus;
  targetDate: string;
  taskCount: number;
  tags?: Array<{ id: string; name: string; color: string }>;
}
