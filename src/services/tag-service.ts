/**
 * Tag Service - Unified business logic for tag management
 * Extracted from tag-tools.ts for better separation of concerns
 */

import type { ProjectStorage } from '../storage/index.js';
import type { Tag, ProjectData } from '../models/index.js';
import type {
  ServiceResult,
  CreateTagData,
  UpdateTagData,
  DeleteTagResult,
  TasksByTagResult,
} from './types.js';

/**
 * Generate a unique tag ID
 * @returns Tag ID in format tag_${timestamp}_${random}
 */
function generateTagId(): string {
  return `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const TAG_COLOR_PALETTE = [
  '#FF6B6B',
  '#FF9F43',
  '#FDCB6E',
  '#6C5CE7',
  '#74B9FF',
  '#00B894',
  '#00CEC9',
  '#E17055',
  '#FAB1A0',
  '#55A3FF',
  '#A29BFE',
  '#FD79A8',
];

function hashTagName(value: string): number {
  let hash = 5381;
  for (const char of value.toLowerCase()) {
    hash = (hash * 33) ^ char.charCodeAt(0);
  }
  return Math.abs(hash >>> 0);
}

function resolveTagColor(tagName: string, inputColor?: string): string {
  if (inputColor) {
    return inputColor;
  }

  const normalizedTagName = tagName.trim();
  if (normalizedTagName.length === 0) {
    return TAG_COLOR_PALETTE[0];
  }

  const colorIndex = hashTagName(normalizedTagName) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[colorIndex];
}

/**
 * TagService - Handles all tag-related business logic
 */
export class TagService {
  private storage: ProjectStorage;

  constructor(storage: ProjectStorage) {
    this.storage = storage;
  }

  /**
   * Create a new tag in a project
   * @param projectId - The project ID
   * @param data - Tag creation data
   * @returns The created tag or error
   */
  async create(projectId: string, data: CreateTagData): Promise<ServiceResult<Tag>> {
    try {
      const projectData = await this.storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      // Check for duplicate tag name (case-insensitive)
      const existingTag = projectData.tags.find(
        (t) => t.name.toLowerCase() === data.name.toLowerCase()
      );
      if (existingTag) {
        return {
          success: false,
          error: `Tag with name '${data.name}' already exists in this project`,
          code: 'DUPLICATE_ERROR',
        };
      }

      const resolvedColor = resolveTagColor(data.name, data.color);
      if (!HEX_COLOR_PATTERN.test(resolvedColor)) {
        return {
          success: false,
          error: `Color must be a valid hex code (e.g., #FF5733), received '${resolvedColor}'`,
          code: 'VALIDATION_ERROR',
        };
      }

      const now = new Date().toISOString();
      const tag: Tag = {
        id: generateTagId(),
        name: data.name,
        color: resolvedColor,
        description: data.description || '',
        createdAt: now,
      };

      projectData.tags.push(tag);
      projectData.project.updatedAt = now;

      await this.saveProjectData(projectId, projectData);

      return {
        success: true,
        data: tag,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tag',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * List all tags in a project
   * @param projectId - The project ID
   * @returns Array of tags or error
   */
  async list(projectId: string): Promise<ServiceResult<Tag[]>> {
    try {
      const projectData = await this.storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const taskTagCounts = new Map<string, number>();
      for (const task of projectData.tasks) {
        for (const tagId of task.tags) {
          taskTagCounts.set(tagId, (taskTagCounts.get(tagId) ?? 0) + 1);
        }
      }

      return {
        success: true,
        data: projectData.tags.map((tag) => ({
          ...tag,
          taskCount: taskTagCounts.get(tag.id) ?? 0,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tags',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Update an existing tag
   * @param projectId - The project ID
   * @param tagId - The tag ID
   * @param data - Tag update data
   * @returns The updated tag or error
   */
  async update(
    projectId: string,
    tagId: string,
    data: UpdateTagData
  ): Promise<ServiceResult<Tag>> {
    try {
      const projectData = await this.storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const tagIndex = projectData.tags.findIndex((t) => t.id === tagId);
      if (tagIndex === -1) {
        return {
          success: false,
          error: `Tag with ID '${tagId}' not found in project '${projectId}'`,
          code: 'NOT_FOUND',
        };
      }

      // Check if there is any field to update
      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error: 'At least one field to update is required',
          code: 'VALIDATION_ERROR',
        };
      }

      // Check for duplicate name if updating name (case-insensitive)
      if (data.name) {
        const existingTag = projectData.tags.find(
          (t) =>
            t.name.toLowerCase() === data.name!.toLowerCase() && t.id !== tagId
        );
        if (existingTag) {
          return {
            success: false,
            error: `Tag with name '${data.name}' already exists in this project`,
            code: 'DUPLICATE_ERROR',
          };
        }
      }

      if (data.color && !HEX_COLOR_PATTERN.test(data.color)) {
        return {
          success: false,
          error: `Color must be a valid hex code (e.g., #FF5733), received '${data.color}'`,
          code: 'VALIDATION_ERROR',
        };
      }

      const now = new Date().toISOString();
      const existingTag = projectData.tags[tagIndex];

      const updatedTag: Tag = {
        ...existingTag,
        ...data,
        id: existingTag.id,
        createdAt: existingTag.createdAt,
      };

      projectData.tags[tagIndex] = updatedTag;
      projectData.project.updatedAt = now;

      await this.saveProjectData(projectId, projectData);

      return {
        success: true,
        data: updatedTag,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tag',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Delete a tag by ID
   * Also removes the tag from all tasks that use it
   * @param projectId - The project ID
   * @param tagId - The tag ID
   * @returns Delete result with tag info and count of updated tasks
   */
  async delete(projectId: string, tagId: string): Promise<ServiceResult<DeleteTagResult>> {
    try {
      const projectData = await this.storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      const tagIndex = projectData.tags.findIndex((t) => t.id === tagId);
      if (tagIndex === -1) {
        return {
          success: false,
          error: `Tag with ID '${tagId}' not found in project '${projectId}'`,
          code: 'NOT_FOUND',
        };
      }

      const tag = projectData.tags[tagIndex];

      // Remove tag from all tasks that use it
      const now = new Date().toISOString();
      let tasksUpdated = 0;
      for (const task of projectData.tasks) {
        const tagIndexInTask = task.tags.indexOf(tagId);
        if (tagIndexInTask !== -1) {
          task.tags.splice(tagIndexInTask, 1);
          task.updatedAt = now;
          tasksUpdated++;
        }
      }

      projectData.tags.splice(tagIndex, 1);
      projectData.project.updatedAt = now;

      await this.saveProjectData(projectId, projectData);

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
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get all tasks that have a specific tag by tag name
   * @param projectId - The project ID
   * @param tagName - The tag name
   * @returns Tag info and matching tasks
   */
  async getTasksByTag(
    projectId: string,
    tagName: string
  ): Promise<ServiceResult<TasksByTagResult>> {
    try {
      const projectData = await this.storage.readProject(projectId);
      if (!projectData) {
        return {
          success: false,
          error: `Project with ID '${projectId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      // Find tag by name (case-insensitive)
      const tag = projectData.tags.find(
        (t) => t.name.toLowerCase() === tagName.toLowerCase()
      );

      if (!tag) {
        return {
          success: false,
          error: `Tag with name '${tagName}' not found in project '${projectId}'`,
          code: 'NOT_FOUND',
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
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Helper method to save project data
   * @param projectId - The project ID
   * @param projectData - The project data to save
   */
  private async saveProjectData(projectId: string, projectData: ProjectData): Promise<void> {
    const filePath = this.storage.getFilePath(projectId);
    const { writeJsonFile } = await import('../utils/file-helpers.js');
    await writeJsonFile(filePath, projectData);
  }
}
