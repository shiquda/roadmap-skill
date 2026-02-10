import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import * as path from 'path';
import type {
  Project,
  ProjectData,
  CreateProjectInput,
  UpdateProjectInput,
  TaskSearchFilters,
} from '../../src/models/index.js';
import { readJsonFile, writeJsonFile, ensureDir } from '../../src/utils/file-helpers.js';

class TestableProjectStorage {
  private storageDir: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  async ensureDirectory(): Promise<void> {
    await ensureDir(this.storageDir);
  }

  getFilePath(projectId: string): string {
    return path.join(this.storageDir, `${projectId}.json`);
  }

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
        continue;
      }
    }

    return projects.sort(
      (a, b) => new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime()
    );
  }

  async searchTasks(
    filters: TaskSearchFilters
  ): Promise<Array<{ task: any; project: Project }>> {
    await this.ensureDirectory();

    const fs = await import('fs/promises');
    const files = await fs.readdir(this.storageDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const results: Array<{ task: any; project: Project }> = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(this.storageDir, file);
        const data = await readJsonFile<ProjectData>(filePath);

        if (filters.projectId && data.project.id !== filters.projectId) {
          continue;
        }

        for (const task of data.tasks) {
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
        continue;
      }
    }

    return results;
  }
}

describe('ProjectStorage', () => {
  let tempDir: string;
  let storage: TestableProjectStorage;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'roadmap-skill-test-'));
    storage = new TestableProjectStorage(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createProject', () => {
    it('should create a project with valid input', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const result = await storage.createProject(input);

      expect(result.project.name).toBe(input.name);
      expect(result.project.description).toBe(input.description);
      expect(result.project.projectType).toBe(input.projectType);
      expect(result.project.status).toBe('active');
      expect(result.project.startDate).toBe(input.startDate);
      expect(result.project.targetDate).toBe(input.targetDate);
      expect(result.project.id).toBeDefined();
      expect(result.project.createdAt).toBeDefined();
      expect(result.project.updatedAt).toBeDefined();
      expect(result.tasks).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.milestones).toEqual([]);
      expect(result.version).toBe(1);
    });

    it('should create multiple projects with unique IDs', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const result1 = await storage.createProject(input);
      const result2 = await storage.createProject(input);

      expect(result1.project.id).not.toBe(result2.project.id);
    });
  });

  describe('readProject', () => {
    it('should read an existing project', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'skill-tree',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);
      const read = await storage.readProject(created.project.id);

      expect(read).not.toBeNull();
      expect(read?.project.id).toBe(created.project.id);
      expect(read?.project.name).toBe(input.name);
      expect(read?.project.description).toBe(input.description);
      expect(read?.project.projectType).toBe(input.projectType);
    });

    it('should return null for non-existent project', async () => {
      const result = await storage.readProject('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return null for invalid project ID format', async () => {
      const result = await storage.readProject('');
      expect(result).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('should update project fields', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'kanban',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);
      const originalUpdatedAt = created.project.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await storage.updateProject(created.project.id, {
        name: 'Updated Project',
        status: 'completed',
      });

      expect(updated).not.toBeNull();
      expect(updated?.project.name).toBe('Updated Project');
      expect(updated?.project.status).toBe('completed');
      expect(updated?.project.description).toBe(input.description);
      expect(updated?.project.projectType).toBe(input.projectType);
      expect(updated?.project.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should update all allowed fields', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const updated = await storage.updateProject(created.project.id, {
        name: 'New Name',
        description: 'New Description',
        projectType: 'skill-tree',
        status: 'archived',
        startDate: '2026-02-01',
        targetDate: '2026-11-30',
      });

      expect(updated?.project.name).toBe('New Name');
      expect(updated?.project.description).toBe('New Description');
      expect(updated?.project.projectType).toBe('skill-tree');
      expect(updated?.project.status).toBe('archived');
      expect(updated?.project.startDate).toBe('2026-02-01');
      expect(updated?.project.targetDate).toBe('2026-11-30');
    });

    it('should return null when updating non-existent project', async () => {
      const result = await storage.updateProject('non-existent-id', {
        name: 'New Name',
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete an existing project', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);
      const deleted = await storage.deleteProject(created.project.id);

      expect(deleted).toBe(true);

      const read = await storage.readProject(created.project.id);
      expect(read).toBeNull();
    });

    it('should return false when deleting non-existent project', async () => {
      const result = await storage.deleteProject('non-existent-id');
      expect(result).toBe(false);
    });

    it('should return false when deleting already deleted project', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);
      await storage.deleteProject(created.project.id);
      const secondDelete = await storage.deleteProject(created.project.id);

      expect(secondDelete).toBe(false);
    });
  });

  describe('listProjects', () => {
    it('should return empty array when no projects exist', async () => {
      const projects = await storage.listProjects();
      expect(projects).toEqual([]);
    });

    it('should list all projects sorted by updatedAt descending', async () => {
      const input1: CreateProjectInput = {
        name: 'Project 1',
        description: 'First project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const input2: CreateProjectInput = {
        name: 'Project 2',
        description: 'Second project',
        projectType: 'skill-tree',
        startDate: '2026-02-01',
        targetDate: '2026-11-30',
      };

      await storage.createProject(input1);
      await new Promise(resolve => setTimeout(resolve, 50));
      await storage.createProject(input2);

      const projects = await storage.listProjects();

      expect(projects.length).toBe(2);
      expect(projects[0].project.name).toBe('Project 2');
      expect(projects[1].project.name).toBe('Project 1');
    });

    it('should include task and milestone counts', async () => {
      const input: CreateProjectInput = {
        name: 'Project with Tasks',
        description: 'A project',
        projectType: 'kanban',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Task 2',
            description: 'Description',
            status: 'done',
            priority: 'high',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        ];
        projectData.milestones = [
          {
            id: 'milestone_1',
            projectId: created.project.id,
            title: 'Milestone 1',
            description: 'Description',
            targetDate: '2026-06-01',
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const projects = await storage.listProjects();

      expect(projects.length).toBe(1);
      expect(projects[0].taskCount).toBe(2);
      expect(projects[0].milestoneCount).toBe(1);
    });

    it('should skip invalid JSON files', async () => {
      const input: CreateProjectInput = {
        name: 'Valid Project',
        description: 'A valid project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      await storage.createProject(input);

      const fs = await import('fs/promises');
      await fs.writeFile(join(tempDir, 'invalid.json'), 'not valid json');

      const projects = await storage.listProjects();

      expect(projects.length).toBe(1);
      expect(projects[0].project.name).toBe('Valid Project');
    });
  });

  describe('searchTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const results = await storage.searchTasks({});
      expect(results).toEqual([]);
    });

    it('should search tasks by projectId', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description 1',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({ projectId: created.project.id });

      expect(results.length).toBe(1);
      expect(results[0].task.title).toBe('Task 1');
      expect(results[0].project.id).toBe(created.project.id);
    });

    it('should filter tasks by status', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Task 2',
            description: 'Description',
            status: 'done',
            priority: 'high',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({ status: 'done' });

      expect(results.length).toBe(1);
      expect(results[0].task.status).toBe('done');
    });

    it('should filter tasks by priority', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description',
            status: 'todo',
            priority: 'low',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Task 2',
            description: 'Description',
            status: 'todo',
            priority: 'critical',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({ priority: 'critical' });

      expect(results.length).toBe(1);
      expect(results[0].task.priority).toBe('critical');
    });

    it('should filter tasks by tags', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: ['tag1', 'tag2'],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Task 2',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: ['tag3'],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({ tags: ['tag1'] });

      expect(results.length).toBe(1);
      expect(results[0].task.tags).toContain('tag1');
    });

    it('should filter tasks by searchText', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Searchable Task',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Other Task',
            description: 'Searchable description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({ searchText: 'searchable' });

      expect(results.length).toBe(2);
    });

    it('should filter tasks by assignee', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: null,
            assignee: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Task 2',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: null,
            assignee: 'user2',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({ assignee: 'user1' });

      expect(results.length).toBe(1);
      expect(results[0].task.assignee).toBe('user1');
    });

    it('should filter tasks by due date range', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: '2026-01-15',
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Task 2',
            description: 'Description',
            status: 'todo',
            priority: 'medium',
            tags: [],
            dueDate: '2026-06-15',
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({
        dueBefore: '2026-03-01',
        dueAfter: '2026-01-01',
      });

      expect(results.length).toBe(1);
      expect(results[0].task.dueDate).toBe('2026-01-15');
    });

    it('should combine multiple filters', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        description: 'A test project',
        projectType: 'roadmap',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
      };

      const created = await storage.createProject(input);

      const projectData = await storage.readProject(created.project.id);
      if (projectData) {
        projectData.tasks = [
          {
            id: 'task_1',
            projectId: created.project.id,
            title: 'Task 1',
            description: 'Description',
            status: 'in-progress',
            priority: 'high',
            tags: ['urgent'],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
          {
            id: 'task_2',
            projectId: created.project.id,
            title: 'Task 2',
            description: 'Description',
            status: 'in-progress',
            priority: 'low',
            tags: ['urgent'],
            dueDate: null,
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
          },
        ];

        const filePath = storage.getFilePath(created.project.id);
        await writeJsonFile(filePath, projectData);
      }

      const results = await storage.searchTasks({
        status: 'in-progress',
        priority: 'high',
        tags: ['urgent'],
      });

      expect(results.length).toBe(1);
      expect(results[0].task.title).toBe('Task 1');
    });
  });
});
