import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs/promises';
import { storage } from '../storage/index.js';
import type { CreateProjectInput, Tag, Task } from '../models/index.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

interface TemplateMetadata {
  name: string;
  description: string;
  projectType: string;
  tasks: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags: string[];
    estimatedHours?: number;
  }>;
  tags: Array<{
    name: string;
    color: string;
  }>;
}

async function getTemplateFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    return files.filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
}

async function loadTemplate(templateName: string): Promise<TemplateMetadata | null> {
  try {
    const fileName = templateName.endsWith('.json') ? templateName : `${templateName}.json`;
    const filePath = path.join(TEMPLATES_DIR, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as TemplateMetadata;
  } catch {
    return null;
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const listTemplatesTool = {
  name: 'list_templates',
  description: 'List all available project templates',
  inputSchema: z.object({}),
  async execute() {
    try {
      const templateFiles = await getTemplateFiles();
      const templates = [];

      for (const file of templateFiles) {
        const template = await loadTemplate(file);
        if (template) {
          templates.push({
            name: file.replace('.json', ''),
            displayName: template.name,
            description: template.description,
            projectType: template.projectType,
            taskCount: template.tasks.length,
            tagCount: template.tags.length,
          });
        }
      }

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list templates',
      };
    }
  },
};

export const getTemplateTool = {
  name: 'get_template',
  description: 'Get detailed information about a specific template',
  inputSchema: z.object({
    templateName: z.string().min(1, 'Template name is required'),
  }),
  async execute(input: { templateName: string }) {
    try {
      const template = await loadTemplate(input.templateName);

      if (!template) {
        return {
          success: false,
          error: `Template '${input.templateName}' not found`,
        };
      }

      return {
        success: true,
        data: {
          name: template.name,
          description: template.description,
          projectType: template.projectType,
          tasks: template.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            priority: t.priority,
            tags: t.tags,
            estimatedHours: t.estimatedHours,
          })),
          tags: template.tags,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get template',
      };
    }
  },
};

export const applyTemplateTool = {
  name: 'apply_template',
  description: 'Create a new project from a template',
  inputSchema: z.object({
    templateName: z.string().min(1, 'Template name is required'),
    projectName: z.string().min(1, 'Project name is required'),
    description: z.string().default(''),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  }),
  async execute(input: {
    templateName: string;
    projectName: string;
    description: string;
    startDate?: string;
    targetDate?: string;
  }) {
    try {
      const template = await loadTemplate(input.templateName);

      if (!template) {
        return {
          success: false,
          error: `Template '${input.templateName}' not found`,
        };
      }

      const projectInput: CreateProjectInput = {
        name: input.projectName,
        description: input.description || template.description,
        projectType: template.projectType as 'roadmap' | 'skill-tree' | 'kanban',
        startDate: input.startDate || new Date().toISOString().split('T')[0],
        targetDate: input.targetDate || new Date().toISOString().split('T')[0],
      };

      const projectData = await storage.createProject(projectInput);
      const projectId = projectData.project.id;
      const now = new Date().toISOString();

      const tagNameToId: Map<string, string> = new Map();
      const tags: Tag[] = [];

      for (const templateTag of template.tags) {
        const tag: Tag = {
          id: generateId('tag'),
          name: templateTag.name,
          color: templateTag.color,
          description: '',
          createdAt: now,
        };
        tags.push(tag);
        tagNameToId.set(templateTag.name, tag.id);
      }

      const tasks: Task[] = [];

      for (const templateTask of template.tasks) {
        const taskTagIds = templateTask.tags
          .map((tagName) => tagNameToId.get(tagName))
          .filter((id): id is string => id !== undefined);

        const task: Task = {
          id: generateId('task'),
          projectId,
          title: templateTask.title,
          description: templateTask.description,
          status: 'todo',
          priority: templateTask.priority,
          tags: taskTagIds,
          dueDate: null,
          assignee: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        };
        tasks.push(task);
      }

      projectData.tags = tags;
      projectData.tasks = tasks;
      projectData.project.updatedAt = now;

      const filePath = storage.getFilePath(projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);

      return {
        success: true,
        data: {
          project: projectData.project,
          taskCount: tasks.length,
          tagCount: tags.length,
          tasksCreated: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
          })),
          tagsCreated: tags.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply template',
      };
    }
  },
};
