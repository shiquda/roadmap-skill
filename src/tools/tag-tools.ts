import { z } from 'zod';
import { storage } from '../storage/index.js';
import type { Tag } from '../models/index.js';

function generateTagId(): string {
  return `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const createTagTool = {
  name: 'create_tag',
  description: 'Create a new tag in a project',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    name: z.string().min(1, 'Tag name is required'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #FF5733)'),
    description: z.string().default(''),
  }),
  async execute(input: {
    projectId: string;
    name: string;
    color: string;
    description: string;
  }) {
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      // Check for duplicate tag name
      const existingTag = projectData.tags.find(
        (t) => t.name.toLowerCase() === input.name.toLowerCase()
      );
      if (existingTag) {
        return {
          success: false,
          error: `Tag with name '${input.name}' already exists in this project`,
        };
      }

      const now = new Date().toISOString();
      const tag: Tag = {
        id: generateTagId(),
        name: input.name,
        color: input.color,
        description: input.description,
        createdAt: now,
      };

      projectData.tags.push(tag);
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(input.projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: tag,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tag',
      };
    }
  },
};

export const listTagsTool = {
  name: 'list_tags',
  description: 'List all tags in a project',
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
        data: projectData.tags,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tags',
      };
    }
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
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      const tagIndex = projectData.tags.findIndex((t) => t.id === input.tagId);
      if (tagIndex === -1) {
        return {
          success: false,
          error: `Tag with ID '${input.tagId}' not found in project '${input.projectId}'`,
        };
      }

      const { projectId, tagId, ...updateData } = input;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'At least one field to update is required',
        };
      }

      // Check for duplicate name if updating name
      if (updateData.name) {
        const existingTag = projectData.tags.find(
          (t) => t.name.toLowerCase() === updateData.name!.toLowerCase() && t.id !== input.tagId
        );
        if (existingTag) {
          return {
            success: false,
            error: `Tag with name '${updateData.name}' already exists in this project`,
          };
        }
      }

      const now = new Date().toISOString();
      const existingTag = projectData.tags[tagIndex];

      const updatedTag: Tag = {
        ...existingTag,
        ...updateData,
        id: existingTag.id,
        createdAt: existingTag.createdAt,
      };

      projectData.tags[tagIndex] = updatedTag;
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(input.projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: updatedTag,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tag',
      };
    }
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
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      const tagIndex = projectData.tags.findIndex((t) => t.id === input.tagId);
      if (tagIndex === -1) {
        return {
          success: false,
          error: `Tag with ID '${input.tagId}' not found in project '${input.projectId}'`,
        };
      }

      const tag = projectData.tags[tagIndex];

      // Remove tag from all tasks that use it
      const now = new Date().toISOString();
      let tasksUpdated = 0;
      for (const task of projectData.tasks) {
        const tagIndexInTask = task.tags.indexOf(input.tagId);
        if (tagIndexInTask !== -1) {
          task.tags.splice(tagIndexInTask, 1);
          task.updatedAt = now;
          tasksUpdated++;
        }
      }

      projectData.tags.splice(tagIndex, 1);
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(input.projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: {
          deleted: true,
          tag,
          tasksUpdated,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete tag',
      };
    }
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
    try {
      const projectData = await storage.readProject(input.projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${input.projectId}' not found`,
        };
      }

      // Find tag by name
      const tag = projectData.tags.find(
        (t) => t.name.toLowerCase() === input.tagName.toLowerCase()
      );

      if (!tag) {
        return {
          success: false,
          error: `Tag with name '${input.tagName}' not found in project '${input.projectId}'`,
        };
      }

      // Find all tasks with this tag
      const tasks = projectData.tasks.filter((t) => t.tags.includes(tag.id));

      return {
        success: true,
        data: {
          tag,
          tasks,
          count: tasks.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tasks by tag',
      };
    }
  },
};
