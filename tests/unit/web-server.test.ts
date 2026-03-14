import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer as createNetServer } from 'net';
import type { Server } from 'http';
import type { ProjectData } from '../../src/models/index.js';
import { readJsonFile, writeJsonFile, ensureDir } from '../../src/utils/file-helpers.js';
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
      milestones: [], tasks: [], tags: [], dependencyViews: [],
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

  describe('Dependency View API', () => {
    it('should create, connect, analyze, and delete dependency views', async () => {
      const createTaskA = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task A', description: '', priority: 'medium', tags: [] }),
      });
      const createTaskB = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task B', description: '', priority: 'medium', tags: [] }),
      });

      const { data: taskA } = await createTaskA.json() as any;
      const { data: taskB } = await createTaskB.json() as any;

      const createViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Release Graph', description: 'Release ordering', dimension: 'release' }),
      });
      expect(createViewRes.status).toBe(200);
      const createViewData = await createViewRes.json() as any;
      const viewId = createViewData.data.id;

      await fetch(api(`/api/projects/${projectId}/dependency-views/${viewId}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskA.id }),
      });
      await fetch(api(`/api/projects/${projectId}/dependency-views/${viewId}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskB.id }),
      });

      const addEdgeRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${viewId}/edges`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: taskA.id, toTaskId: taskB.id }),
      });
      expect(addEdgeRes.status).toBe(200);

      const analyzeRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${viewId}/analyze`));
      expect(analyzeRes.status).toBe(200);
      const analyzeData = await analyzeRes.json() as any;
      expect(analyzeData.data.topologicalOrder).toEqual([taskA.id, taskB.id]);
      expect(analyzeData.data.readyTaskIds).toEqual([taskA.id]);

      const deleteViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${viewId}`), {
        method: 'DELETE',
      });
      expect(deleteViewRes.status).toBe(200);
    });

    it('should reject cyclic dependency edges', async () => {
      const createTaskA = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task A', description: '', priority: 'medium', tags: [] }),
      });
      const createTaskB = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task B', description: '', priority: 'medium', tags: [] }),
      });

      const { data: taskA } = await createTaskA.json() as any;
      const { data: taskB } = await createTaskB.json() as any;

      const createViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cycle Guard', description: '' }),
      });
      const { data: view } = await createViewRes.json() as any;

      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskA.id }),
      });
      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskB.id }),
      });

      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: taskA.id, toTaskId: taskB.id }),
      });

      const cycleRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: taskB.id, toTaskId: taskA.id }),
      });

      expect(cycleRes.status).toBe(400);
      const cycleData = await cycleRes.json() as any;
      expect(cycleData.error).toContain('cycle');
    });

    it('should delete dependency edges through the web API', async () => {
      const createTaskA = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task A', description: '', priority: 'medium', tags: [] }),
      });
      const createTaskB = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task B', description: '', priority: 'medium', tags: [] }),
      });

      const { data: taskA } = await createTaskA.json() as any;
      const { data: taskB } = await createTaskB.json() as any;

      const createViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete Edge Graph', description: '' }),
      });
      const { data: view } = await createViewRes.json() as any;

      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskA.id }),
      });
      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskB.id }),
      });

      const addEdgeRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: taskA.id, toTaskId: taskB.id }),
      });
      const addEdgeData = await addEdgeRes.json() as any;
      const edgeId = addEdgeData.data.edges[0].id;

      const deleteEdgeRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges/${edgeId}`), {
        method: 'DELETE',
      });

      expect(deleteEdgeRes.status).toBe(200);
      const deleteEdgeData = await deleteEdgeRes.json() as any;
      expect(deleteEdgeData.success).toBe(true);
      expect(deleteEdgeData.data.edges).toHaveLength(0);
      expect(deleteEdgeData.data.nodes).toHaveLength(2);
    });

    it('should update dependency edge direction through the web API', async () => {
      const createTaskA = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task A', description: '', priority: 'medium', tags: [] }),
      });
      const createTaskB = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task B', description: '', priority: 'medium', tags: [] }),
      });

      const { data: taskA } = await createTaskA.json() as any;
      const { data: taskB } = await createTaskB.json() as any;

      const createViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Reverse Edge Graph', description: '' }),
      });
      const { data: view } = await createViewRes.json() as any;

      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskA.id }),
      });
      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskB.id }),
      });

      const addEdgeRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: taskA.id, toTaskId: taskB.id }),
      });
      const addEdgeData = await addEdgeRes.json() as any;
      const edgeId = addEdgeData.data.edges[0].id;

      const updateEdgeRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges/${edgeId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: taskB.id, toTaskId: taskA.id }),
      });

      expect(updateEdgeRes.status).toBe(200);
      const updateEdgeData = await updateEdgeRes.json() as any;
      expect(updateEdgeData.success).toBe(true);
      expect(updateEdgeData.data.edges).toHaveLength(1);
      expect(updateEdgeData.data.edges[0].fromTaskId).toBe(taskB.id);
      expect(updateEdgeData.data.edges[0].toTaskId).toBe(taskA.id);
    });

    it('should return a full dependency view after removing a node', async () => {
      const createTaskA = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task A', description: '', priority: 'medium', tags: [] }),
      });
      const createTaskB = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task B', description: '', priority: 'medium', tags: [] }),
      });

      const { data: taskA } = await createTaskA.json() as any;
      const { data: taskB } = await createTaskB.json() as any;

      const createViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete Node Graph', description: '' }),
      });
      const { data: view } = await createViewRes.json() as any;

      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskA.id }),
      });
      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskB.id }),
      });
      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: taskA.id, toTaskId: taskB.id }),
      });

      const removeNodeRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes/${taskA.id}`), {
        method: 'DELETE',
      });

      expect(removeNodeRes.status).toBe(200);
      const removeNodeData = await removeNodeRes.json() as any;
      expect(removeNodeData.success).toBe(true);
      expect(removeNodeData.data.nodes).toHaveLength(1);
      expect(removeNodeData.data.nodes[0].taskId).toBe(taskB.id);
      expect(removeNodeData.data.edges).toHaveLength(0);
    });

    it('should keep project JSON valid during concurrent dependency edge writes', async () => {
      const createdTasks = await Promise.all(
        Array.from({ length: 6 }, (_, index) =>
          fetch(api('/api/tasks'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              title: `Task ${index + 1}`,
              description: '',
              priority: 'medium',
              tags: [],
            }),
          }).then(async (response) => response.json() as Promise<{ data: { id: string } }>)
        )
      );

      const createViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Concurrent Graph', description: '' }),
      });
      const { data: view } = await createViewRes.json() as { data: { id: string } };

      await Promise.all(
        createdTasks.map((task) =>
          fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.data.id }),
          })
        )
      );

      const sourceTaskId = createdTasks[0].data.id;
      const edgeResponses = await Promise.all(
        createdTasks.slice(1).map((task) =>
          fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/edges`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromTaskId: sourceTaskId, toTaskId: task.data.id }),
          })
        )
      );

      edgeResponses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const savedProject = await readJsonFile<ProjectData>(path.join(tempDir, `${projectId}.json`));
      expect(savedProject.dependencyViews).toHaveLength(1);
      expect(savedProject.dependencyViews[0].edges).toHaveLength(5);
    });

    it('should batch update node positions in a single request', async () => {
      const createTaskA = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task A', description: '', priority: 'medium', tags: [] }),
      });
      const createTaskB = await fetch(api('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: 'Task B', description: '', priority: 'medium', tags: [] }),
      });

      const { data: taskA } = await createTaskA.json() as any;
      const { data: taskB } = await createTaskB.json() as any;

      const createViewRes = await fetch(api(`/api/projects/${projectId}/dependency-views`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Batch Layout', description: '' }),
      });
      const { data: view } = await createViewRes.json() as any;

      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskA.id }),
      });
      await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: taskB.id }),
      });

      const batchRes = await fetch(api(`/api/projects/${projectId}/dependency-views/${view.id}/nodes`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: [
            { taskId: taskA.id, x: 320, y: 120 },
            { taskId: taskB.id, x: 640, y: 240 },
          ],
        }),
      });

      expect(batchRes.status).toBe(200);
      const batchData = await batchRes.json() as any;
      expect(batchData.success).toBe(true);

      const savedProject = await readJsonFile<ProjectData>(path.join(tempDir, `${projectId}.json`));
      const savedView = savedProject.dependencyViews.find((item) => item.id === view.id);
      expect(savedView?.nodes.find((node) => node.taskId === taskA.id)?.x).toBe(320);
      expect(savedView?.nodes.find((node) => node.taskId === taskB.id)?.y).toBe(240);
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
