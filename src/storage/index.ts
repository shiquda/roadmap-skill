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

/**
 * Storage class for managing roadmap-skill projects
 * Projects are stored as individual JSON files in ~/.roadmap-skill/projects/
 */
export class ProjectStorage {
  private storageDir: string;

  constructor() {
    this.storageDir = getStorageDir();
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
      return await readJsonFile<ProjectData>(filePath);
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
    const projectData = await this.readProject(projectId);
    if (!projectData) {
      return null;
    }

    const now = new Date().toISOString();

    projectData.project = {
      ...projectData.project,
      ...input,
      updatedAt: now,
    };

    const filePath = this.getFilePath(projectId);
    await writeJsonFile(filePath, projectData);

    return projectData;
  }

  /**
   * Delete a project by ID
   * @param projectId - The project ID
   * @returns True if deleted, false if not found
   */
  async deleteProject(projectId: string): Promise<boolean> {
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

          results.push({ task, project: data.project });
        }
      } catch {
        // Skip invalid files
        continue;
      }
    }

    return results;
  }
}

// Export singleton instance
export const storage = new ProjectStorage();
