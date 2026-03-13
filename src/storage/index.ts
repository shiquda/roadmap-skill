import * as path from 'path';
import type {
  Project,
  ProjectData,
  Task,
  TaskSearchFilters,
  CreateProjectInput,
  UpdateProjectInput,
} from '../models/index.js';
import { getStorageDir } from '../utils/path-helpers.js';
import { readJsonFile, writeJsonFile, ensureDir } from '../utils/file-helpers.js';

type ProjectMutationResult<T> = {
  result: T;
  shouldSave: boolean;
};

/**
 * Storage class for managing roadmap-skill projects
 * Projects are stored as individual JSON files in ~/.roadmap-skill/projects/
 */
export class ProjectStorage {
  private storageDir: string;
  private projectMutationQueues: Map<string, Promise<void>>;

  constructor() {
    this.storageDir = getStorageDir();
    this.projectMutationQueues = new Map();
  }

  private async runProjectMutation<T>(projectId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.projectMutationQueues.get(projectId) ?? Promise.resolve();

    let releaseQueue!: () => void;
    const current = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    this.projectMutationQueues.set(projectId, current);

    try {
      await previous;
      return await operation();
    } finally {
      releaseQueue();
      if (this.projectMutationQueues.get(projectId) === current) {
        this.projectMutationQueues.delete(projectId);
      }
    }
  }

  async mutateProject<T>(
    projectId: string,
    updater: (projectData: ProjectData) => Promise<ProjectMutationResult<T>> | ProjectMutationResult<T>
  ): Promise<T | null> {
    return this.runProjectMutation(projectId, async () => {
      const projectData = await this.readProject(projectId);
      if (!projectData) {
        return null;
      }

      const updateResult = await updater(projectData);
      if (updateResult.shouldSave) {
        await writeJsonFile(this.getFilePath(projectId), projectData);
      }

      return updateResult.result;
    });
  }

  /**
   * Ensure the storage directory exists
   */
  async ensureDirectory(): Promise<void> {
    await ensureDir(this.storageDir);
  }

  /**
   * Get the file path for a project
   * @param projectId - The project ID
   * @returns Full path to the project JSON file
   */
  getFilePath(projectId: string): string {
    return path.join(this.storageDir, `${projectId}.json`);
  }

  /**
   * Create a new project
   * @param input - Project creation data
   * @returns The created project data
   */
  async createProject(input: CreateProjectInput): Promise<ProjectData> {
    await this.ensureDirectory();

    const now = new Date().toISOString();
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const project: Project = {
      id: projectId,
      name: input.name,
      description: input.description,
      projectType: input.projectType,
      status: 'active',
      startDate: input.startDate,
      targetDate: input.targetDate,
      createdAt: now,
      updatedAt: now,
    };

    const projectData: ProjectData = {
      version: 1,
      project,
      milestones: [],
      tasks: [],
      tags: [],
      dependencyViews: [],
    };

    const filePath = this.getFilePath(projectId);
    await writeJsonFile(filePath, projectData);

    return projectData;
  }

  /**
   * Read a project by ID
   * @param projectId - The project ID
   * @returns The project data or null if not found
   */
  async readProject(projectId: string): Promise<ProjectData | null> {
    try {
      const filePath = this.getFilePath(projectId);
      const projectData = await readJsonFile<ProjectData>(filePath);
      return {
        ...projectData,
        dependencyViews: projectData.dependencyViews ?? [],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update an existing project
   * @param projectId - The project ID
   * @param input - Project update data
   * @returns The updated project data or null if not found
   */
  async updateProject(
    projectId: string,
    input: UpdateProjectInput
  ): Promise<ProjectData | null> {
    return this.mutateProject(projectId, async (projectData) => {
      const now = new Date().toISOString();

      projectData.project = {
        ...projectData.project,
        ...input,
        updatedAt: now,
      };

      return {
        result: projectData,
        shouldSave: true,
      };
    });
  }

  /**
   * Delete a project by ID
   * @param projectId - The project ID
   * @returns True if deleted, false if not found
   */
  async deleteProject(projectId: string): Promise<boolean> {
    return this.runProjectMutation(projectId, async () => {
      try {
        const filePath = this.getFilePath(projectId);
        const fs = await import('fs/promises');
        await fs.unlink(filePath);
        return true;
      } catch (error) {
        if (error instanceof Error && error.message.includes('ENOENT')) {
          return false;
        }
        throw error;
      }
    });
  }

  /**
   * List all projects sorted by updatedAt (descending)
   * @returns Array of project summaries (project + metadata)
   */
  async listProjects(): Promise<Array<{ project: Project; taskCount: number; milestoneCount: number }>> {
    await this.ensureDirectory();

    const fs = await import('fs/promises');
    const files = await fs.readdir(this.storageDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const projects: Array<{ project: Project; taskCount: number; milestoneCount: number }> = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(this.storageDir, file);
        const data = await readJsonFile<ProjectData>(filePath);
        projects.push({
          project: data.project,
          taskCount: data.tasks.length,
          milestoneCount: data.milestones.length,
        });
      } catch {
        // Skip invalid files
        continue;
      }
    }

    // Sort by updatedAt descending
    return projects.sort(
      (a, b) => new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime()
    );
  }

  /**
   * Search tasks across all projects with filters
   * @param filters - Search filters
   * @returns Array of matching tasks with project context
   */
  async searchTasks(
    filters: TaskSearchFilters
  ): Promise<Array<{ task: Task; project: Project }>> {
    await this.ensureDirectory();

    const fs = await import('fs/promises');
    const files = await fs.readdir(this.storageDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const results: Array<{ task: Task; project: Project }> = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(this.storageDir, file);
        const data = await readJsonFile<ProjectData>(filePath);

        // Skip if project filter doesn't match
        if (filters.projectId && data.project.id !== filters.projectId) {
          continue;
        }

        for (const task of data.tasks) {
          // Apply filters
          if (filters.status && task.status !== filters.status) {
            continue;
          }
          if (filters.priority && task.priority !== filters.priority) {
            continue;
          }
          if (filters.assignee && task.assignee !== filters.assignee) {
            continue;
          }
          if (filters.dueBefore && task.dueDate && task.dueDate > filters.dueBefore) {
            continue;
          }
          if (filters.dueAfter && task.dueDate && task.dueDate < filters.dueAfter) {
            continue;
          }
          if (
            filters.tags &&
            filters.tags.length > 0 &&
            !filters.tags.some((tag) => task.tags.includes(tag))
          ) {
            continue;
          }
          if (
            filters.searchText &&
            !task.title.toLowerCase().includes(filters.searchText.toLowerCase()) &&
            !task.description.toLowerCase().includes(filters.searchText.toLowerCase())
          ) {
            continue;
          }

          // Filter completed tasks (done status) unless includeCompleted is explicitly true
          if (filters.includeCompleted !== true && task.status === 'done') {
            continue;
          }

          results.push({ task, project: data.project });
        }
      } catch {
        // Skip invalid files
        continue;
      }
    }

    return results;
  }

  async exportAllData(): Promise<{
    version: number;
    exportedAt: string;
    projects: ProjectData[];
  }> {
    await this.ensureDirectory();

    const fs = await import('fs/promises');
    const files = await fs.readdir(this.storageDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const projects: ProjectData[] = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(this.storageDir, file);
        const data = await readJsonFile<ProjectData>(filePath);
        projects.push(data);
      } catch {
        continue;
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
    };
  }

  async importAllData(data: {
    version: number;
    exportedAt: string;
    projects: ProjectData[];
  }): Promise<{
    success: boolean;
    imported: number;
    errors: number;
    errorDetails: string[];
  }> {
    await this.ensureDirectory();

    let imported = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid backup data: projects array is required');
    }

    for (const projectData of data.projects) {
      try {
        if (!projectData.project || !projectData.project.id) {
          errors++;
          errorDetails.push('Skipping invalid project: missing project or id');
          continue;
        }

        const filePath = this.getFilePath(projectData.project.id);
        await this.runProjectMutation(projectData.project.id, async () => {
          await writeJsonFile(filePath, projectData);
        });
        imported++;
      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errorDetails.push(`Failed to import project ${projectData.project?.id || 'unknown'}: ${errorMessage}`);
      }
    }

    return {
      success: errors === 0,
      imported,
      errors,
      errorDetails,
    };
  }
}

export const storage = new ProjectStorage();
