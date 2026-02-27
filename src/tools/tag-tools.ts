import { z } from 'zod';
import { TagService } from '../services/index.js';
import { storage } from '../storage/index.js';

const tagService = new TagService(storage);

export const createTagTool = {
  name: 'create_tag',
  description: 'Create a new tag in a project. If color is omitted, it is generated deterministically from tag name.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    name: z.string().min(1, 'Tag name is required'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #FF5733)').optional(),
    description: z.string().default(''),
  }),
  async execute(input: {
    projectId: string;
    name: string;
    color?: string;
    description: string;
  }) {
    const { projectId, ...data } = input;
    const result = await tagService.create(projectId, data);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  },
};

export const listTagsTool = {
  name: 'list_tags',
  description: 'List all tags in a project',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  async execute(input: { projectId: string }) {
    const result = await tagService.list(input.projectId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  },
};

export const updateTagTool = {
  name: 'update_tag',
  description: 'Update an existing tag',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    tagId: z.string().min(1, 'Tag ID is required'),
    name: z.string().min(1).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    description: z.string().optional(),
  }),
  async execute(input: {
    projectId: string;
    tagId: string;
    name?: string;
    color?: string;
    description?: string;
  }) {
    const { projectId, tagId, ...data } = input;
    const result = await tagService.update(projectId, tagId, data);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  },
};

export const deleteTagTool = {
  name: 'delete_tag',
  description: 'Delete a tag by project ID and tag ID',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    tagId: z.string().min(1, 'Tag ID is required'),
  }),
  async execute(input: { projectId: string; tagId: string }) {
    const result = await tagService.delete(input.projectId, input.tagId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  },
};

export const getTasksByTagTool = {
  name: 'get_tasks_by_tag',
  description: 'Get all tasks that have a specific tag',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    tagName: z.string().min(1, 'Tag name is required'),
  }),
  async execute(input: { projectId: string; tagName: string }) {
    const result = await tagService.getTasksByTag(input.projectId, input.tagName);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  },
};
