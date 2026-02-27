import { z } from 'zod';
import { storage } from '../storage/index.js';
import type { Project, ProjectSummary, Task, TaskSummary, CreateProjectInput, UpdateProjectInput } from '../models/index.js';

const ProjectTypeEnum = z.enum(['roadmap', 'skill-tree', 'kanban']);
const ProjectStatusEnum = z.enum(['active', 'completed', 'archived']);

function toProjectSummary(
  project: Project,
  taskCount: number,
  tags?: Array<{ id: string; name: string; color: string }>
): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    projectType: project.projectType,
    status: project.status,
    targetDate: project.targetDate,
    taskCount,
    ...(tags ? { tags } : {}),
  };
}

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

export const createProjectTool = {
  name: 'create_project',
  description: 'Create a new project roadmap. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string(),
    projectType: ProjectTypeEnum,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    name: string;
    description: string;
    projectType: 'roadmap' | 'skill-tree' | 'kanban';
    startDate: string;
    targetDate: string;
    verbose?: boolean;
  }) {
    try {
      const projectInput: CreateProjectInput = {
        name: input.name,
        description: input.description,
        projectType: input.projectType,
        startDate: input.startDate,
        targetDate: input.targetDate,
      };
      const projectData = await storage.createProject(projectInput);
      return {
        success: true,
        data: input.verbose
          ? projectData
          : toProjectSummary(projectData.project, 0),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      };
    }
  },
};

export const listProjectsTool = {
  name: 'list_projects',
  description: 'List all projects. Summary mode includes current project tags for Agent reuse. Set verbose=true for full project data.',
  inputSchema: z.object({
    verbose: z.boolean().optional(),
  }),
  async execute(input: { verbose?: boolean }) {
    try {
      const projects = await storage.listProjects();

      if (input.verbose) {
        return {
          success: true,
          data: projects,
        };
      }

      const summaries = await Promise.all(
        projects.map(async (projectSummary) => {
          const projectData = await storage.readProject(projectSummary.project.id);
          const tags = (projectData?.tags ?? []).map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          }));

          return toProjectSummary(projectSummary.project, projectSummary.taskCount, tags);
        })
      );

      return {
        success: true,
        data: summaries,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list projects',
      };
    }
  },
};

export const getProjectTool = {
  name: 'get_project',
  description: 'Get a project by ID with all its data (tasks, tags, milestones). Tasks are returned as summaries by default; set verbose=true for full task data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: { projectId: string; verbose?: boolean }) {
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }
      return {
        success: true,
        data: input.verbose
          ? projectData
          : {
              ...projectData,
              tasks: projectData.tasks.map(toTaskSummary),
            },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project',
      };
    }
  },
};

export const updateProjectTool = {
  name: 'update_project',
  description: 'Update an existing project. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    projectType: ProjectTypeEnum.optional(),
    status: ProjectStatusEnum.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    name?: string;
    description?: string;
    projectType?: 'roadmap' | 'skill-tree' | 'kanban';
    status?: 'active' | 'completed' | 'archived';
    startDate?: string;
    targetDate?: string;
    verbose?: boolean;
  }) {
    try {
      const { projectId, verbose, ...updateData } = input;
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'At least one field to update is required',
        };
      }
      const updateInput: UpdateProjectInput = updateData;
      const projectData = await storage.updateProject(projectId, updateInput);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
        };
      }
      return {
        success: true,
        data: verbose
          ? projectData
          : toProjectSummary(projectData.project, projectData.tasks.length),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project',
      };
    }
  },
};

export const deleteProjectTool = {
  name: 'delete_project',
  description: 'Delete a project by ID',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  async execute(input: { projectId: string }) {
    try {
      const deleted = await storage.deleteProject(input.projectId);

      if (!deleted) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete project',
      };
    }
  },
};
