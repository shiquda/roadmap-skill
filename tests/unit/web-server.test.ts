import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer as createNetServer } from 'net';
import type { Server } from 'http';
import type { ProjectData } from '../../src/models/index.js';
import { writeJsonFile, ensureDir } from '../../src/utils/file-helpers.js';
import * as path from 'path';

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createNetServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      if (!addr || typeof addr !== 'object') { s.close(() => reject(new Error('no addr'))); return; }
      const port = addr.port;
      s.close((err) => err ? reject(err) : resolve(port));
    });
  });
}

describe('Web Server API', () => {
  let tempDir: string;
  let server: Server;
  let port: number;
  let projectId: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'roadmap-skill-web-test-'));
    port = await getAvailablePort();

    const { storage } = await import('../../src/storage/index.js');
    Object.defineProperty(storage, 'storageDir', { value: tempDir, writable: true, configurable: true });

    const now = new Date().toISOString();
    projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const projectData: ProjectData = {
      version: 1,
      project: { id: projectId, name: 'Test', description: '', projectType: 'kanban', status: 'active', startDate: '2026-01-01', targetDate: '2026-12-31', createdAt: now, updatedAt: now },
      milestones: [], tasks: [], tags: [],
    };
    await ensureDir(tempDir);
    await writeJsonFile(path.join(tempDir, `${projectId}.json`), projectData);

    const { createServer } = await import('../../src/web/server.js');
    server = await createServer(port);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(tempDir, { recursive: true, force: true });
  });

  const api = (path: string) => `http://127.0.0.1:${port}${path}`;

  describe('GET /api/projects', () => {
    it('should return project list', async () => {
      const res = await fetch(api('/api/projects'));
      expect(res.status).toBe(200);
      const data = await res.json() as any[];
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].project.id).toBe(projectId);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project by id', async () => {
      const res = await fetch(api(`/api/projects/${projectId}`));
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.project.id).toBe(projectId);
    });

    it('should return 404 for unknown project', async () => {
      const res = await fetch(api('/api/projects/nonexistent'));
      expect(res.status).toBe(404);
    });
  });

  describe('Tag API /api/projects/:projectId/tags', () => {
    it('POST should create a tag', async () => {
      const res = await fetch(api(`/api/projects/${projectId}/tags`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bug', color: '#FF0000' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Bug');
      expect(data.data.id).toBeDefined();
    });

    it('GET should list tags', async () => {
      await fetch(api(`/api/projects/${projectId}/tags`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Feature', color: '#00FF00' }),
      });

      const res = await fetch(api(`/api/projects/${projectId}/tags`));
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Feature');
    });

    it('PUT should update a tag', async () => {
      const createRes = await fetch(api(`/api/projects/${projectId}/tags`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'OldName', color: '#FF0000' }),
      });
      const { data: tag } = await createRes.json() as any;

      const res = await fetch(api(`/api/projects/${projectId}/tags/${tag.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'NewName', color: '#0000FF' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('NewName');
    });

    it('DELETE should remove a tag', async () => {
      const createRes = await fetch(api(`/api/projects/${projectId}/tags`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ToDelete', color: '#FF0000' }),
      });
      const { data: tag } = await createRes.json() as any;

      const res = await fetch(api(`/api/projects/${projectId}/tags/${tag.id}`), { method: 'DELETE' });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);

      const listRes = await fetch(api(`/api/projects/${projectId}/tags`));
      const listData = await listRes.json() as any;
      expect(listData.data).toHaveLength(0);
    });

    it('POST should return 400 for duplicate tag name', async () => {
      await fetch(api(`/api/projects/${projectId}/tags`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dup', color: '#FF0000' }),
      });
      const res = await fetch(api(`/api/projects/${projectId}/tags`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dup', color: '#00FF00' }),
      });
      expect(res.status).toBe(400);
    });

    it('GET should return 404 for unknown project', async () => {
      const res = await fetch(api('/api/projects/nonexistent/tags'));
      expect(res.status).toBe(404);
    });
  });

  describe('Task API', () => {
    it('POST /api/tasks should create a task', async () => {
      const res = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'My Task', description: 'desc', priority: 'medium', tags: [] }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('My Task');
    });

    it('GET /api/tasks should filter by projectId', async () => {
      await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task A', description: '', priority: 'low', tags: [] }),
      });

      const res = await fetch(api(`/api/tasks?projectId=${projectId}`));
      expect(res.status).toBe(200);
      const data = await res.json() as any[];
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].project.id).toBe(projectId);
    });

    it('PUT /api/tasks should update task status', async () => {
      const createRes = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task B', description: '', priority: 'medium', tags: [] }),
      });
      const { data: task } = await createRes.json() as any;

      const res = await fetch(api('/api/tasks'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, taskId: task.id, status: 'done' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.data.status).toBe('done');
    });

    it('DELETE /api/tasks should delete a task', async () => {
      const createRes = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task C', description: '', priority: 'medium', tags: [] }),
      });
      const { data: task } = await createRes.json() as any;

      const res = await fetch(api(`/api/tasks?projectId=${projectId}&taskId=${task.id}`), { method: 'DELETE' });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
    });
  });

  describe('Backup API', () => {
    it('GET /api/backup should export data', async () => {
      const res = await fetch(api('/api/backup'));
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.version).toBe(1);
      expect(Array.isArray(data.projects)).toBe(true);
    });

    it('POST /api/backup should import data', async () => {
      const exportRes = await fetch(api('/api/backup'));
      const backup = await exportRes.json();

      const res = await fetch(api('/api/backup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
    });
  });
});
