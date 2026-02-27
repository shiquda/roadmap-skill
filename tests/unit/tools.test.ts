import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import * as path from 'path';
import type { ProjectData, Task, Tag } from '../../src/models/index.js';
import { writeJsonFile, ensureDir } from '../../src/utils/file-helpers.js';
import {
  createProjectTool,
  listProjectsTool,
  getProjectTool,
  updateProjectTool,
  deleteProjectTool,
} from '../../src/tools/project-tools.js';
import {
  createTaskTool,
  listTasksTool,
  getTaskTool,
  updateTaskTool,
  deleteTaskTool,
  batchUpdateTasksTool,
} from '../../src/tools/task-tools.js';
import {
  createTagTool,
  listTagsTool,
  updateTagTool,
  deleteTagTool,
  getTasksByTagTool,
} from '../../src/tools/tag-tools.js';

class TestableStorage {
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

  async createProjectData(projectData: ProjectData): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.getFilePath(projectData.project.id);
    await writeJsonFile(filePath, projectData);
  }
}

describe('Tools', () => {
  let tempDir: string;
  let testStorage: TestableStorage;
  let originalStorageDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'roadmap-skill-tools-test-'));
    testStorage = new TestableStorage(tempDir);

    const { getStorageDir } = await import('../../src/utils/path-helpers.js');
    originalStorageDir = getStorageDir();

    const { storage } = await import('../../src/storage/index.js');
    Object.defineProperty(storage, 'storageDir', {
      value: tempDir,
      writable: true,
      configurable: true,
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createTestProject(name: string = 'Test Project'): Promise<ProjectData> {
    const now = new Date().toISOString();
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const projectData: ProjectData = {
      version: 1,
      project: {
        id: projectId,
        name,
        description: 'Test description',
        projectType: 'roadmap',
        status: 'active',
        startDate: '2026-01-01',
        targetDate: '2026-12-31',
        createdAt: now,
        updatedAt: now,
      },
      milestones: [],
      tasks: [],
      tags: [],
    };

    await testStorage.createProjectData(projectData);
    return projectData;
  }

  describe('Project Tools', () => {
    describe('createProjectTool', () => {
      it('should create a project successfully', async () => {
        const result = await createProjectTool.execute({
          name: 'New Project',
          description: 'Project description',
          projectType: 'roadmap',
          startDate: '2026-01-01',
          targetDate: '2026-12-31',
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.name).toBe('New Project');
        expect(result.data.status).toBe('active');
      });

    });

    describe('listProjectsTool', () => {
      it('should list all projects', async () => {
        await createTestProject('Project 1');
        await createTestProject('Project 2');

        const result = await listProjectsTool.execute({});

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });

      it('should return empty array when no projects exist', async () => {
        const result = await listProjectsTool.execute({});

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should include project tags in summary mode', async () => {
        const project = await createTestProject('Project With Tags');

        const tagResult = await createTagTool.execute({
          projectId: project.project.id,
          name: 'Backend',
          color: '#2563EB',
          description: '',
        });

        expect(tagResult.success).toBe(true);

        const result = await listProjectsTool.execute({});
        expect(result.success).toBe(true);

        const target = (result.data as Array<{ id: string; tags?: Array<{ id: string; name: string; color: string }> }>).find(
          (item) => item.id === project.project.id
        );

        expect(target).toBeDefined();
        expect(target?.tags).toBeDefined();
        expect(target?.tags).toHaveLength(1);
        expect(target?.tags?.[0].name).toBe('Backend');
      });
    });

    describe('getProjectTool', () => {
      it('should get an existing project', async () => {
        const project = await createTestProject('My Project');

        const result = await getProjectTool.execute({ projectId: project.project.id });

        expect(result.success).toBe(true);
        expect(result.data.project.id).toBe(project.project.id);
        expect(result.data.project.name).toBe('My Project');
      });

      it('should return error for non-existent project', async () => {
        const result = await getProjectTool.execute({ projectId: 'non-existent' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('updateProjectTool', () => {
      it('should update project fields', async () => {
        const project = await createTestProject('Original Name');

        const result = await updateProjectTool.execute({
          projectId: project.project.id,
          name: 'Updated Name',
          status: 'completed',
        });

        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Updated Name');
        expect(result.data.status).toBe('completed');
      });

      it('should return error for non-existent project', async () => {
        const result = await updateProjectTool.execute({
          projectId: 'non-existent',
          name: 'New Name',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });

      it('should return error when no fields provided', async () => {
        const project = await createTestProject('Test Project');

        const result = await updateProjectTool.execute({
          projectId: project.project.id,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('At least one field');
      });
    });

    describe('deleteProjectTool', () => {
      it('should delete an existing project', async () => {
        const project = await createTestProject('To Delete');

        const result = await deleteProjectTool.execute({ projectId: project.project.id });

        expect(result.success).toBe(true);
        expect(result.data.deleted).toBe(true);

        const getResult = await getProjectTool.execute({ projectId: project.project.id });
        expect(getResult.success).toBe(false);
      });

      it('should return error for non-existent project', async () => {
        const result = await deleteProjectTool.execute({ projectId: 'non-existent' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });
  });

  describe('Task Tools', () => {
    async function createTestTask(projectId: string, title: string): Promise<Task> {
      const result = await createTaskTool.execute({
        projectId,
        title,
        description: 'Task description',
        priority: 'medium',
        tags: [],
      });

      return result.data as Task;
    }

    describe('createTaskTool', () => {
      it('should create a task in a project', async () => {
        const project = await createTestProject('Test Project');

        const result = await createTaskTool.execute({
          projectId: project.project.id,
          title: 'New Task',
          description: 'Task description',
          priority: 'high',
          tags: [],
        });

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('New Task');
        expect(result.data.priority).toBe('high');
        expect(result.data.status).toBe('todo');
      });

      it('should return error for non-existent project', async () => {
        const result = await createTaskTool.execute({
          projectId: 'non-existent',
          title: 'New Task',
          description: 'Task description',
          priority: 'medium',
          tags: [],
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });

      it('should reject unknown tag IDs', async () => {
        const project = await createTestProject('Test Project');

        const result = await createTaskTool.execute({
          projectId: project.project.id,
          title: 'New Task',
          description: 'Task description',
          priority: 'medium',
          tags: ['unknown-tag-id'],
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid tag IDs');
      });
    });

    describe('listTasksTool', () => {
      it('should list tasks with filters', async () => {
        const project = await createTestProject('Test Project');
        await createTestTask(project.project.id, 'Task 1');
        await createTestTask(project.project.id, 'Task 2');

        const result = await listTasksTool.execute({ projectId: project.project.id });

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });

      it('should filter tasks by status', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task 1');

        await updateTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
          status: 'done',
        });

        const result = await listTasksTool.execute({
          projectId: project.project.id,
          status: 'done',
          includeCompleted: true,
        });

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].status).toBe('done');
      });
    });

    describe('getTaskTool', () => {
      it('should get a specific task', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'My Task');

        const result = await getTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
        });

        expect(result.success).toBe(true);
        expect(result.data.id).toBe(task.id);
        expect(result.data.title).toBe('My Task');
      });

      it('should return error for non-existent task', async () => {
        const project = await createTestProject('Test Project');

        const result = await getTaskTool.execute({
          projectId: project.project.id,
          taskId: 'non-existent',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('updateTaskTool', () => {
      it('should update task fields', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Original Title');

        const result = await updateTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
          title: 'Updated Title',
          status: 'in-progress',
        });

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Updated Title');
        expect(result.data.status).toBe('in-progress');
      });

      it('should set completedAt when status changes to done', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task');

        const result = await updateTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
          status: 'done',
          verbose: true,
        });
        expect(result.success).toBe(true);
        expect(result.data.status).toBe('done');
        expect(result.data.completedAt).toBeDefined();
      });

      it('should return error when no fields provided', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task');

        const result = await updateTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('At least one field');
      });

      it('should return validation error when updating with unknown tag IDs', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task');

        const result = await updateTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
          tags: ['unknown-tag-id'],
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid tag IDs');
      });
    });

    describe('deleteTaskTool', () => {
      it('should delete a task', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'To Delete');

        const result = await deleteTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
        });

        expect(result.success).toBe(true);
        expect(result.data.deleted).toBe(true);

        const getResult = await getTaskTool.execute({
          projectId: project.project.id,
          taskId: task.id,
        });
        expect(getResult.success).toBe(false);
      });
    });

    describe('batchUpdateTasksTool', () => {
      it('should update multiple tasks at once', async () => {
        const project = await createTestProject('Test Project');
        const task1 = await createTestTask(project.project.id, 'Task 1');
        const task2 = await createTestTask(project.project.id, 'Task 2');

        const result = await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task1.id, task2.id],
          status: 'in-progress',
        });

        expect(result.success).toBe(true);
        expect(result.data.updatedCount).toBe(2);
        expect(result.data.updatedTasks[0].status).toBe('in-progress');
        expect(result.data.updatedTasks[1].status).toBe('in-progress');
      });

      it('should handle partial updates when some tasks not found', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task 1');

        const result = await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task.id, 'non-existent'],
          status: 'done',
        });

        expect(result.success).toBe(true);
        expect(result.data.updatedCount).toBe(1);
        expect(result.data.notFoundIds).toContain('non-existent');
      });

      it('should add tags with add operation', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task');
        const tagResult = await createTagTool.execute({
          projectId: project.project.id,
          name: 'New Tag',
          color: '#10B981',
          description: '',
        });

        expect(tagResult.success).toBe(true);
        const createdTagId = (tagResult.data as { id: string }).id;

        const result = await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task.id],
          tags: [createdTagId],
          tagOperation: 'add',
        });

        expect(result.success).toBe(true);
        expect(result.data.updatedTasks[0].tags).toContain(createdTagId);
      });

      it('should remove tags with remove operation', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task');
        const tagAResult = await createTagTool.execute({
          projectId: project.project.id,
          name: 'Tag A',
          color: '#EF4444',
          description: '',
        });
        const tagBResult = await createTagTool.execute({
          projectId: project.project.id,
          name: 'Tag B',
          color: '#3B82F6',
          description: '',
        });

        expect(tagAResult.success).toBe(true);
        expect(tagBResult.success).toBe(true);
        const tagAId = (tagAResult.data as { id: string }).id;
        const tagBId = (tagBResult.data as { id: string }).id;

        await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task.id],
          tags: [tagAId, tagBId],
          tagOperation: 'replace',
        });

        const result = await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task.id],
          tags: [tagAId],
          tagOperation: 'remove',
        });

        expect(result.success).toBe(true);
        expect(result.data.updatedTasks[0].tags).not.toContain(tagAId);
        expect(result.data.updatedTasks[0].tags).toContain(tagBId);
      });

      it('should replace tags with replace operation', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task');
        const oldTagResult = await createTagTool.execute({
          projectId: project.project.id,
          name: 'Old Tag',
          color: '#F59E0B',
          description: '',
        });
        const newTagResult = await createTagTool.execute({
          projectId: project.project.id,
          name: 'New Tag',
          color: '#8B5CF6',
          description: '',
        });

        expect(oldTagResult.success).toBe(true);
        expect(newTagResult.success).toBe(true);
        const oldTagId = (oldTagResult.data as { id: string }).id;
        const newTagId = (newTagResult.data as { id: string }).id;

        await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task.id],
          tags: [oldTagId],
          tagOperation: 'replace',
        });

        const result = await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task.id],
          tags: [newTagId],
          tagOperation: 'replace',
        });

        expect(result.success).toBe(true);
        expect(result.data.updatedTasks[0].tags).toEqual([newTagId]);
      });

      it('should handle tasks with undefined tags', async () => {
        const project = await createTestProject('Test Project');
        const tagResult = await createTagTool.execute({
          projectId: project.project.id,
          name: 'Recovered Tag',
          color: '#14B8A6',
          description: '',
        });
        expect(tagResult.success).toBe(true);
        const recoveredTagId = (tagResult.data as { id: string }).id;

        // Create a task manually with undefined tags to simulate legacy data
        const { storage } = await import('../../src/storage/index.js');
        const projectData = await storage.readProject(project.project.id);
        const taskWithUndefinedTags = {
          id: `task_${Date.now()}_undefined`,
          projectId: project.project.id,
          title: 'Task with undefined tags',
          description: 'Description',
          status: 'todo',
          priority: 'medium',
          tags: undefined as any,
          dueDate: null,
          assignee: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        };
        projectData!.tasks.push(taskWithUndefinedTags as any);
        const filePath = testStorage.getFilePath(project.project.id);
        const { writeJsonFile } = await import('../../src/utils/file-helpers.js');
        await writeJsonFile(filePath, projectData!);

        const result = await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [taskWithUndefinedTags.id],
          tags: [recoveredTagId],
          tagOperation: 'add',
        });

        expect(result.success, result.error).toBe(true);
        expect(result.data!.updatedTasks[0].tags).toContain(recoveredTagId);
      });

      it('should reject unknown tag IDs in batch update', async () => {
        const project = await createTestProject('Test Project');
        const task = await createTestTask(project.project.id, 'Task');

        const result = await batchUpdateTasksTool.execute({
          projectId: project.project.id,
          taskIds: [task.id],
          tags: ['unknown-tag-id'],
          tagOperation: 'replace',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid tag IDs');
      });
    });
  });

  describe('Tag Tools', () => {
    async function createTestTag(projectId: string, name: string, color: string): Promise<Tag> {
      const result = await createTagTool.execute({
        projectId,
        name,
        color,
        description: '',
      });

      return result.data as Tag;
    }

    describe('createTagTool', () => {
      it('should create a tag in a project', async () => {
        const project = await createTestProject('Test Project');

        const result = await createTagTool.execute({
          projectId: project.project.id,
          name: 'Bug',
          color: '#FF0000',
          description: 'Bug tag',
        });

        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Bug');
        expect(result.data.color).toBe('#FF0000');
      });

      it('should prevent duplicate tag names', async () => {
        const project = await createTestProject('Test Project');
        await createTestTag(project.project.id, 'Bug', '#FF0000');

        const result = await createTagTool.execute({
          projectId: project.project.id,
          name: 'bug',
          color: '#00FF00',
          description: '',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('already exists');
      });

      it('should return error for non-existent project', async () => {
        const result = await createTagTool.execute({
          projectId: 'non-existent',
          name: 'Bug',
          color: '#FF0000',
          description: '',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('listTagsTool', () => {
      it('should list all tags in a project', async () => {
        const project = await createTestProject('Test Project');
        await createTestTag(project.project.id, 'Bug', '#FF0000');
        await createTestTag(project.project.id, 'Feature', '#00FF00');

        const result = await listTagsTool.execute({ projectId: project.project.id });

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });
    });

    describe('updateTagTool', () => {
      it('should update tag fields', async () => {
        const project = await createTestProject('Test Project');
        const tag = await createTestTag(project.project.id, 'Bug', '#FF0000');

        const result = await updateTagTool.execute({
          projectId: project.project.id,
          tagId: tag.id,
          name: 'Critical Bug',
          color: '#FF0000',
        });

        expect(result.success).toBe(true);
        expect(result.data.name).toBe('Critical Bug');
      });

      it('should prevent duplicate names when updating', async () => {
        const project = await createTestProject('Test Project');
        await createTestTag(project.project.id, 'Bug', '#FF0000');
        const featureTag = await createTestTag(project.project.id, 'Feature', '#00FF00');

        const result = await updateTagTool.execute({
          projectId: project.project.id,
          tagId: featureTag.id,
          name: 'Bug',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('already exists');
      });
    });

    describe('deleteTagTool', () => {
      it('should delete a tag', async () => {
        const project = await createTestProject('Test Project');
        const tag = await createTestTag(project.project.id, 'To Delete', '#FF0000');

        const result = await deleteTagTool.execute({
          projectId: project.project.id,
          tagId: tag.id,
        });

        expect(result.success).toBe(true);
        expect(result.data.deleted).toBe(true);

        const listResult = await listTagsTool.execute({ projectId: project.project.id });
        expect(listResult.data).toHaveLength(0);
      });

      it('should remove tag from tasks when deleted', async () => {
        const project = await createTestProject('Test Project');
        const tag = await createTestTag(project.project.id, 'Bug', '#FF0000');

        const taskResult = await createTaskTool.execute({
          projectId: project.project.id,
          title: 'Bug Task',
          description: 'Description',
          priority: 'medium',
          tags: [tag.id],
        });

        await deleteTagTool.execute({
          projectId: project.project.id,
          tagId: tag.id,
        });

        const getResult = await getTaskTool.execute({
          projectId: project.project.id,
          taskId: taskResult.data.id,
        });

        expect(getResult.data.tags).not.toContain(tag.id);
      });
    });

    describe('getTasksByTagTool', () => {
      it('should get tasks by tag name', async () => {
        const project = await createTestProject('Test Project');
        const tag = await createTestTag(project.project.id, 'Bug', '#FF0000');

        await createTaskTool.execute({
          projectId: project.project.id,
          title: 'Bug Task 1',
          description: 'Description',
          priority: 'medium',
          tags: [tag.id],
        });

        await createTaskTool.execute({
          projectId: project.project.id,
          title: 'Bug Task 2',
          description: 'Description',
          priority: 'medium',
          tags: [tag.id],
        });

        const result = await getTasksByTagTool.execute({
          projectId: project.project.id,
          tagName: 'Bug',
        });

        expect(result.success).toBe(true);
        expect(result.data.tasks).toHaveLength(2);
        expect(result.data.count).toBe(2);
      });

      it('should return error for non-existent tag', async () => {
        const project = await createTestProject('Test Project');

        const result = await getTasksByTagTool.execute({
          projectId: project.project.id,
          tagName: 'NonExistent',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });
  });
});
