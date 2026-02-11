import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Server } from 'http';
import { storage } from '../storage/index.js';
import { TaskService, TagService } from '../services/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tagService = new TagService(storage);

export function createServer(port: number = 7860): Promise<Server> {
  return new Promise((resolve, reject) => {
    const app = express();

    app.use(express.json());

    app.get('/api/projects', async (_req, res) => {
      try {
        const projects = await storage.listProjects();
        res.json(projects);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.get('/api/projects/:id', async (req, res) => {
      try {
        const project = await storage.readProject(req.params.id);
        if (!project) {
          res.status(404).json({ error: 'Project not found' });
          return;
        }
        res.json(project);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.get('/api/tasks', async (req, res) => {
      try {
        const filters: Record<string, unknown> = { ...req.query };

        // Convert includeCompleted from string to boolean
        if (filters.includeCompleted !== undefined) {
          filters.includeCompleted = filters.includeCompleted === 'true';
        }

        const tasks = await storage.searchTasks(filters as any);
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/projects', async (req, res) => {
      try {
        const project = await storage.createProject(req.body);
        res.json({ success: true, data: project });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.put('/api/projects', async (req, res) => {
      try {
        const { projectId, ...updateData } = req.body;
        const project = await storage.updateProject(projectId, updateData);
        res.json({ success: true, data: project });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.delete('/api/projects', async (req, res) => {
      try {
        const { projectId } = req.query;
        await storage.deleteProject(projectId as string);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/tasks', async (req, res) => {
      try {
        const { projectId, ...taskData } = req.body;
        const result = await TaskService.create(projectId, taskData);
        if (!result.success) {
          const statusCode = result.code === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.put('/api/tasks', async (req, res) => {
      try {
        const { projectId, taskId, ...updateData } = req.body;
        const result = await TaskService.update(projectId, taskId, updateData);
        if (!result.success) {
          const statusCode = result.code === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.delete('/api/tasks', async (req, res) => {
      try {
        const { projectId, taskId } = req.query;
        const result = await TaskService.delete(projectId as string, taskId as string);
        if (!result.success) {
          const statusCode = result.code === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ error: result.error });
          return;
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/projects/:projectId/tags', async (req, res) => {
      try {
        const { projectId } = req.params;
        const result = await tagService.create(projectId, req.body);
        if (!result.success) {
          const statusCode = result.code === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.get('/api/projects/:projectId/tags', async (req, res) => {
      try {
        const { projectId } = req.params;
        const result = await tagService.list(projectId);
        if (!result.success) {
          const statusCode = result.code === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.put('/api/projects/:projectId/tags/:tagId', async (req, res) => {
      try {
        const { projectId, tagId } = req.params;
        const result = await tagService.update(projectId, tagId, req.body);
        if (!result.success) {
          const statusCode = result.code === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.delete('/api/projects/:projectId/tags/:tagId', async (req, res) => {
      try {
        const { projectId, tagId } = req.params;
        const result = await tagService.delete(projectId, tagId);
        if (!result.success) {
          const statusCode = result.code === 'NOT_FOUND' ? 404 : 400;
          res.status(statusCode).json({ error: result.error });
          return;
        }
        res.json({ success: true, data: result.data });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.get('/api/backup', async (_req, res) => {
      try {
        const backup = await storage.exportAllData();
        const filename = `roadmap-skill-backup-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(backup);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/api/backup', async (req, res) => {
      try {
        const result = await storage.importAllData(req.body);
        res.json(result);
      } catch (error) {
        res.status(400).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    const distPath = path.join(__dirname, 'app');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API not found' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });

    const server = app.listen(port, '127.0.0.1');

    server.once('listening', () => {
      console.log(`Web interface server running at http://localhost:${port}`);
      resolve(server);
    });

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
        return;
      }

      reject(error);
    });
  });
}

// Start server if run directly
if (process.argv[1]?.endsWith('server.js')) {
  const port = parseInt(process.argv[2] || '7860', 10);
  createServer(port).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
