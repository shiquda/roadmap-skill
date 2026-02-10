import { z } from 'zod';
import { storage } from '../storage/index.js';
import type { CreateProjectInput, UpdateProjectInput } from '../models/index.js';

const ProjectTypeEnum = z.enum(['roadmap', 'skill-tree', 'kanban']);
const ProjectStatusEnum = z.enum(['active', 'completed', 'archived']);

export const createProjectTool = {
  name: 'create_project',
  description: 'Create a new project roadmap',
  inputSchema: z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string(),
    projectType: ProjectTypeEnum,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  }),
  async execute(input: {
    name: string;
    description: string;
    projectType: 'roadmap' | 'skill-tree' | 'kanban';
    startDate: string;
    targetDate: string;
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
        data: projectData,
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
  description: 'List all projects with their task and milestone counts',
  inputSchema: z.object({}),
  async execute() {
    try {
      const projects = await storage.listProjects();
      return {
        success: true,
        data: projects,
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
  description: 'Get a project by ID with all its data (tasks, tags, milestones)',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  async execute(input: { projectId: string }) {
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
        data: projectData,
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
  description: 'Update an existing project',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    projectType: ProjectTypeEnum.optional(),
    status: ProjectStatusEnum.optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  async execute(input: {
    projectId: string;
    name?: string;
    description?: string;
    projectType?: 'roadmap' | 'skill-tree' | 'kanban';
    status?: 'active' | 'completed' | 'archived';
    startDate?: string;
    targetDate?: string;
  }) {
    try {
      const { projectId, ...updateData } = input;

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
        data: projectData,
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
