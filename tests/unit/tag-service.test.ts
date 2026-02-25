import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { TagService } from '../../src/services/tag-service.js';
import { createTagTool, listTagsTool } from '../../src/tools/tag-tools.js';
import { createTaskTool } from '../../src/tools/task-tools.js';
import type { ProjectData } from '../../src/models/index.js';
import { writeJsonFile, ensureDir } from '../../src/utils/file-helpers.js';
import * as path from 'path';

describe('TagService', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'roadmap-skill-tag-service-test-'));
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

  async function createTestProject(): Promise<ProjectData> {
    const now = new Date().toISOString();
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const projectData: ProjectData = {
      version: 1,
      project: {
        id: projectId,
        name: 'Test Project',
        description: '',
        projectType: 'kanban',
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
    await ensureDir(tempDir);
    await writeJsonFile(path.join(tempDir, `${projectId}.json`), projectData);
    return projectData;
  }

  describe('list with taskCount', () => {
    it('should return taskCount=0 for tags with no tasks', async () => {
      const project = await createTestProject();
      await createTagTool.execute({ projectId: project.project.id, name: 'Bug', color: '#FF0000', description: '' });

      const result = await listTagsTool.execute({ projectId: project.project.id });

      if (!result.success) throw new Error(result.error);
      expect(result.data).toHaveLength(1);
      expect((result.data[0] as any).taskCount).toBe(0);
    });

    it('should return correct taskCount when tasks use the tag', async () => {
      const project = await createTestProject();
      const tagResult = await createTagTool.execute({ projectId: project.project.id, name: 'Feature', color: '#00FF00', description: '' });
      if (!tagResult.success) throw new Error(tagResult.error);
      const tagId = tagResult.data.id;

      await createTaskTool.execute({ projectId: project.project.id, title: 'Task 1', description: '', priority: 'medium', tags: [tagId] });
      await createTaskTool.execute({ projectId: project.project.id, title: 'Task 2', description: '', priority: 'medium', tags: [tagId] });
      await createTaskTool.execute({ projectId: project.project.id, title: 'Task 3', description: '', priority: 'medium', tags: [] });

      const result = await listTagsTool.execute({ projectId: project.project.id });

      if (!result.success) throw new Error(result.error);
      expect((result.data[0] as any).taskCount).toBe(2);
    });

    it('should return independent taskCounts for multiple tags', async () => {
      const project = await createTestProject();
      const bugResult = await createTagTool.execute({ projectId: project.project.id, name: 'Bug', color: '#FF0000', description: '' });
      const featResult = await createTagTool.execute({ projectId: project.project.id, name: 'Feature', color: '#00FF00', description: '' });
      if (!bugResult.success) throw new Error(bugResult.error);
      if (!featResult.success) throw new Error(featResult.error);
      const bugId = bugResult.data.id;
      const featId = featResult.data.id;

      await createTaskTool.execute({ projectId: project.project.id, title: 'Bug Task', description: '', priority: 'medium', tags: [bugId] });
      await createTaskTool.execute({ projectId: project.project.id, title: 'Feat Task 1', description: '', priority: 'medium', tags: [featId] });
      await createTaskTool.execute({ projectId: project.project.id, title: 'Feat Task 2', description: '', priority: 'medium', tags: [featId] });

      const result = await listTagsTool.execute({ projectId: project.project.id });

      if (!result.success) throw new Error(result.error);
      const bugTag = result.data.find(t => t.name === 'Bug') as any;
      const featTag = result.data.find(t => t.name === 'Feature') as any;
      expect(bugTag.taskCount).toBe(1);
      expect(featTag.taskCount).toBe(2);
    });
  });

  describe('list via TagService directly', () => {
    it('should return tags with taskCount via service', async () => {
      const { storage } = await import('../../src/storage/index.js');
      const service = new TagService(storage);
      const project = await createTestProject();

      await service.create(project.project.id, { name: 'Tag1', color: '#AABBCC' });
      const result = await service.list(project.project.id);

      if (!result.success) throw new Error(result.error);
      expect(result.data).toHaveLength(1);
      expect((result.data[0] as any).taskCount).toBe(0);
    });
  });
});
