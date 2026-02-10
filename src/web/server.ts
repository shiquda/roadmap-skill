import express from 'express';
import * as path from 'path';
import { storage } from '../storage/index.js';

export function createServer(port: number = 7860) {
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
      const filters = req.query;
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
      const projectData = await storage.readProject(projectId);
      if (!projectData) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const now = new Date().toISOString();
      const task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        projectId,
        ...taskData,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        tags: taskData.tags || [],
        dueDate: taskData.dueDate || null,
        assignee: taskData.assignee || null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      projectData.tasks.push(task);
      projectData.project.updatedAt = now;
      const filePath = storage.getFilePath(projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);
      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/tasks', async (req, res) => {
    try {
      const { projectId, taskId, ...updateData } = req.body;
      const projectData = await storage.readProject(projectId);
      if (!projectData) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const taskIndex = projectData.tasks.findIndex((t: any) => t.id === taskId);
      if (taskIndex === -1) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      const now = new Date().toISOString();
      const existingTask = projectData.tasks[taskIndex];
      const updatedTask = {
        ...existingTask,
        ...updateData,
        id: existingTask.id,
        projectId: existingTask.projectId,
        createdAt: existingTask.createdAt,
        updatedAt: now,
        completedAt: updateData.status === 'done' && existingTask.status !== 'done'
          ? now
          : updateData.status && updateData.status !== 'done'
            ? null
            : existingTask.completedAt,
      };
      projectData.tasks[taskIndex] = updatedTask;
      projectData.project.updatedAt = now;
      const filePath = storage.getFilePath(projectId);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);
      res.json({ success: true, data: updatedTask });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/tasks', async (req, res) => {
    try {
      const { projectId, taskId } = req.query;
      const projectData = await storage.readProject(projectId as string);
      if (!projectData) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      const taskIndex = projectData.tasks.findIndex((t: any) => t.id === taskId);
      if (taskIndex === -1) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      projectData.tasks.splice(taskIndex, 1);
      projectData.project.updatedAt = new Date().toISOString();
      const filePath = storage.getFilePath(projectId as string);
      const { writeJsonFile } = await import('../utils/file-helpers.js');
      await writeJsonFile(filePath, projectData);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  const distPath = path.join(process.cwd(), 'dist', 'web', 'app');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API not found' });
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Web interface server running at http://0.0.0.0:${port}`);
  });

  return server;
}
