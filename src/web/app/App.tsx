import React, { useState, useEffect } from 'react';
import { getItem, setItem, STORAGE_KEYS } from './utils/storage.js';
import TagBadge from './components/TagBadge.js';
import TagFilter from './components/TagFilter.js';
import TagSelector from './components/TagSelector.js';
import TagManagerModal from './components/modals/TagManagerModal.js';

interface Project {
  id: string;
  name: string;
  description?: string;
  projectType: string;
  status: string;
  updatedAt: string;
}

interface ProjectSummary {
  project: Project;
  taskCount: number;
  milestoneCount: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  description?: string;
  dueDate?: string;
  assignee?: string;
  tags: string[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt?: string;
  taskCount?: number;
}

type CardMode = 'compact' | 'detailed';
type StatusFilter = 'all' | 'active' | 'completed';
type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

function normalizeStatus(status: string): TaskStatus {
  const normalized = status.replace('_', '-');
  if (normalized === 'todo' || normalized === 'in-progress' || normalized === 'review' || normalized === 'done') {
    return normalized;
  }
  return 'todo';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  todo: { label: 'TODO', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  'in-progress': { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  review: { label: 'Review', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  done: { label: 'Done', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  medium: { label: 'Medium', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  low: { label: 'Low', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
};

const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

const App: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{ task: Task; project: Project }[]>([]);
  const [cardMode, setCardMode] = useState<CardMode>('compact');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [taskFormError, setTaskFormError] = useState('');
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    dueDate: '',
    showDueDate: false,
    tags: [] as string[],
  });
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>('todo');
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    projectType: 'roadmap' as 'roadmap' | 'skill-tree' | 'kanban',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: '',
  });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    const savedProjectId = getItem<string>(STORAGE_KEYS.SELECTED_PROJECT_ID);
    if (savedProjectId) {
      setSelectedProject(savedProjectId);
    }

    const savedViewPreferences = getItem<{ cardMode: CardMode }>(STORAGE_KEYS.VIEW_PREFERENCES);
    if (savedViewPreferences?.cardMode) {
      setCardMode(savedViewPreferences.cardMode);
    }
  }, []);

  // Persist selected project when it changes
  useEffect(() => {
    if (selectedProject !== null) {
      setItem(STORAGE_KEYS.SELECTED_PROJECT_ID, selectedProject);
    } else {
      // Clear storage when "All Projects" is selected
      setItem(STORAGE_KEYS.SELECTED_PROJECT_ID, null);
    }
  }, [selectedProject]);

  // Persist view preferences when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setItem(STORAGE_KEYS.VIEW_PREFERENCES, { cardMode });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [cardMode]);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data as ProjectSummary[]);
      });
  }, []);

  useEffect(() => {
    const url = selectedProject 
      ? `/api/tasks?projectId=${selectedProject}`
      : '/api/tasks';
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const normalized = (data as { task: Task; project: Project }[]).map((item) => ({
          ...item,
          task: {
            ...item.task,
            status: normalizeStatus(item.task.status),
            tags: item.task.tags || [],
          },
        }));
        setTasks(normalized);
      });
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/projects/${selectedProject}/tags`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const tagList = data.data as Tag[];
            const taskTagCounts = new Map<string, number>();
            tasks.forEach(({ task }) => {
              (task.tags || []).forEach(id => taskTagCounts.set(id, (taskTagCounts.get(id) ?? 0) + 1));
            });
            setTags(tagList.map(t => ({ ...t, taskCount: taskTagCounts.get(t.id) ?? 0 })));
          }
        });
    } else {
      setTags([]);
      setSelectedTagIds([]);
    }
  }, [selectedProject]);

  const filteredTasks = tasks.filter(({ task }) => {
    if (statusFilter === 'completed') {
      if (normalizeStatus(task.status) !== 'done') return false;
    }
    if (statusFilter === 'active') {
      if (normalizeStatus(task.status) === 'done') return false;
    }
    if (selectedTagIds.length > 0) {
      if (!task.tags || !selectedTagIds.every(id => task.tags.includes(id))) {
        return false;
      }
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(keyword);
      const matchDescription = task.description?.toLowerCase().includes(keyword) ?? false;
      if (!matchTitle && !matchDescription) return false;
    }
    return true;
  });

  const handleTagsChange = (newTags: Tag[]) => {
    setTags(newTags);
    const tagIds = new Set(newTags.map(t => t.id));
    setTasks(prev => prev.map(item => ({
      ...item,
      task: {
        ...item.task,
        tags: (item.task.tags || []).filter(id => tagIds.has(id))
      }
    })));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;

    try {
      const response = await fetch(`/api/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: tasks.find(t => t.task.id === editingTask.id)?.project.id,
          taskId: editingTask.id,
          title: editingTask.title,
          description: editingTask.description,
          status: normalizeStatus(editingTask.status),
          priority: editingTask.priority,
          tags: editingTask.tags,
          dueDate: editingTask.dueDate,
        }),
      });

      if (response.ok) {
        setTasks(prev => prev.map(t => 
          t.task.id === editingTask.id
            ? { ...t, task: { ...editingTask, status: normalizeStatus(editingTask.status) } }
            : t
        ));
        setIsEditModalOpen(false);
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string, projectId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}&taskId=${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTasks(prev => prev.filter(t => t.task.id !== taskId));
        setProjects(prev => prev.map(p => 
          p.project.id === projectId 
            ? { ...p, taskCount: p.taskCount - 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? All tasks will be deleted.')) return;

    try {
      const response = await fetch(`/api/projects?projectId=${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProjects(prev => prev.filter(p => p.project.id !== projectId));
        if (selectedProject === projectId) {
          setSelectedProject(null);
        }
        setTasks(prev => prev.filter(t => t.project.id !== projectId));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `roadmap-skill-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      const result = await response.json();
      if (result.success) {
        setImportStatus({ type: 'success', message: `Successfully imported ${result.imported} projects` });
        window.location.reload();
      } else {
        setImportStatus({ type: 'error', message: `Import completed with ${result.errors} errors` });
      }
    } catch (error) {
      setImportStatus({ type: 'error', message: 'Import failed: ' + (error instanceof Error ? error.message : 'Invalid file') });
    }
  };

  const handleDragOverFile = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDraggingFile(true);
    }
  };

  const handleDragLeaveFile = (e: React.DragEvent) => {
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDraggingFile(false);
  };

  const handleDropFile = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        await handleImport(file);
      } else {
        setImportStatus({ type: 'error', message: 'Please drop a JSON backup file' });
      }
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setProjects(prev => [...prev, {
            project: result.data,
            taskCount: 0,
            milestoneCount: 0
          }]);
          setIsCreateProjectOpen(false);
          setNewProject({
            name: '',
            description: '',
            projectType: 'roadmap',
            startDate: new Date().toISOString().split('T')[0],
            targetDate: '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCreateTask = async () => {
    const title = newTaskForm.title.trim();
    if (!title) {
      setTaskFormError('Title is required.');
      return;
    }
    if (title.length < 3) {
      setTaskFormError('Title must be at least 3 characters.');
      return;
    }
    if (title.length > 120) {
      setTaskFormError('Title must be 120 characters or fewer.');
      return;
    }

    const targetProjectId = selectedProject;
    if (!targetProjectId) {
      setTaskFormError('Please select a project from the left sidebar before adding a task.');
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: targetProjectId,
          title,
          description: newTaskForm.description,
          status: normalizeStatus(createTaskStatus),
          priority: newTaskForm.priority,
          dueDate: newTaskForm.dueDate || undefined,
          tags: newTaskForm.tags,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const project = projects.find(p => p.project.id === targetProjectId)?.project || projects[0].project;
          setTasks(prev => [...prev, { task: { ...result.data, status: normalizeStatus(result.data.status) }, project }]);
          setProjects(prev => prev.map(p =>
            p.project.id === targetProjectId
              ? { ...p, taskCount: p.taskCount + 1 }
              : p
          ));
          setNewTaskForm({
            title: '',
            description: '',
            priority: 'medium',
            dueDate: '',
            showDueDate: false,
            tags: [],
          });
          setTaskFormError('');
          setIsCreateTaskModalOpen(false);
        }
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      setTaskFormError('Failed to create task. Please try again.');
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask) return;

    const taskItem = tasks.find(t => t.task.id === draggedTask);
    if (!taskItem || normalizeStatus(taskItem.task.status) === normalizeStatus(newStatus)) {
      setDraggedTask(null);
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: taskItem.project.id,
          taskId: draggedTask,
          status: normalizeStatus(newStatus),
        }),
      });

      if (response.ok) {
        setTasks(prev => prev.map(t => 
          t.task.id === draggedTask 
            ? { ...t, task: { ...t.task, status: normalizeStatus(newStatus) } }
            : t
        ));
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
    
    setDraggedTask(null);
  };

  const getTasksByStatus = (status: TaskStatus) => 
    filteredTasks
      .filter(({ task }) => normalizeStatus(task.status) === status)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.task.priority as keyof typeof priorityOrder] - priorityOrder[b.task.priority as keyof typeof priorityOrder];
      });

  const renderTaskCard = ({ task, project }: { task: Task; project: Project }) => {
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const isDragging = draggedTask === task.id;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={() => setDraggedTask(null)}
        className={`bg-white rounded-2xl border border-slate-100/50 cursor-move transition-all duration-300 ease-out group flex flex-col ${
          isDragging
            ? 'shadow-2xl scale-105 border-emerald-400 rotate-1 z-10'
            : 'shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-100'
        } ${
          cardMode === 'compact' ? 'p-4' : 'p-5'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${priority.bgColor} ${priority.color} border border-current opacity-80`}>
            {priority.label}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditTask(task);
              }}
              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTask(task.id, project.id);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        <h3
          onClick={() => handleEditTask(task)}
          className={`text-slate-800 font-bold cursor-pointer leading-tight hover:text-emerald-500 transition-colors ${
            cardMode === 'compact' ? 'text-sm line-clamp-2' : 'text-base line-clamp-2 mb-2'
          }`}
        >
          {task.title}
        </h3>
        
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 mb-1">
            {task.tags.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              return tag ? (
                <TagBadge
                  key={tagId}
                  name={tag.name}
                  color={tag.color}
                  size="sm"
                  className="rounded-lg font-bold"
                />
              ) : null;
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[100px]">{project.name}</span>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
              <span>📅</span>
              <span>{new Date(task.dueDate).toLocaleDateString([], {month: 'short', day: 'numeric'})}</span>
            </div>
          )}
        </div>

        {cardMode === 'detailed' && task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-3 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
            {task.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 p-8">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tightest">
            Nova<span className="text-emerald-500">Board</span>
          </h1>
          <p className="text-slate-500 mt-3 font-medium text-lg italic">Visual task & project management</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-2 min-w-[200px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Projects</h2>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              title="New Project"
            >
              <span className="text-lg">+</span>
            </button>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setSelectedProject(null)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${!selectedProject ? 'bg-white shadow-md ring-1 ring-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
            >
              <div className="flex justify-between items-center">
                <span>All Projects</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${!selectedProject ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {projects.reduce((sum, p) => sum + p.taskCount, 0)}
                </span>
              </div>
            </button>
            {projects.map(p => (
              <div key={p.project.id} className="group relative">
                <button
                  onClick={() => setSelectedProject(p.project.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${selectedProject === p.project.id ? 'bg-white shadow-md ring-1 ring-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate pr-6">{p.project.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedProject === p.project.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {p.taskCount}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(p.project.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Project"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200/50 space-y-3">
            <button
              onClick={() => setIsTagManagerOpen(true)}
              disabled={!selectedProject}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-white/50 rounded-xl transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-lg group-hover:scale-125 transition-transform">🏷️</span>
              <span>Manage Tags</span>
            </button>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-white/50 rounded-xl transition-all"
              title="Export all data as JSON"
            >
              <span className="text-lg">📥</span>
              <span>Export Data</span>
            </button>
            <label className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-white/50 rounded-xl transition-all cursor-pointer">
              <span className="text-lg">📤</span>
              <span>Import Data</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImport(file);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>
        </aside>

        <main
          className={`lg:col-span-10 relative ${isDraggingFile ? 'ring-2 ring-blue-400 ring-dashed bg-blue-50/30' : ''}`}
          onDragOver={handleDragOverFile}
          onDragLeave={handleDragLeaveFile}
          onDrop={handleDropFile}
        >
          {isDraggingFile && (
            <div className="absolute inset-0 bg-blue-100/80 flex items-center justify-center z-50 rounded-xl">
              <div className="text-center">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-lg font-medium text-blue-900">Drop backup file here</p>
                <p className="text-sm text-blue-600">JSON files only</p>
              </div>
            </div>
          )}
          {importStatus && (
            <div
              className={`absolute top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 transition-all ${
                importStatus.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {importStatus.message}
              <button
                onClick={() => setImportStatus(null)}
                className="ml-3 text-sm font-medium hover:opacity-70"
              >
                ×
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-6 mb-8 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">View</span>
              <div className="flex bg-slate-200/50 rounded-xl p-1">
                <button
                  onClick={() => setCardMode('compact')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    cardMode === 'compact'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Compact
                </button>
                <button
                  onClick={() => setCardMode('detailed')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    cardMode === 'detailed'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200/50 hidden md:block" />

            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Tags</span>
              {tags.length > 0 ? (
                <TagFilter
                  tags={tags}
                  selectedTags={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              ) : (
                <span className="text-xs text-slate-400 italic">No tags defined</span>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200/50 hidden md:block" />

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</span>
              <div className="flex bg-slate-200/50 rounded-xl p-1">
                {(['all', 'active', 'completed'] as StatusFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                      statusFilter === f
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200/50 hidden md:block" />

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Search tasks..."
                  className="pl-9 pr-4 py-2 text-sm bg-white/50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all w-48 shadow-inner"
                />
              </div>
            </div>

            <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full ml-auto">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map(column => {
              const columnTasks = getTasksByStatus(column);
              const statusConfig = STATUS_CONFIG[column];
              const isDragOver = dragOverColumn === column;
              return (
                <div
                  key={column}
                  className={`rounded-2xl p-4 min-h-[500px] transition-all duration-300 flex flex-col ${
                    isDragOver 
                      ? 'bg-emerald-100/50 ring-2 ring-emerald-400 shadow-lg scale-[1.02]' 
                      : 'bg-white/30 backdrop-blur-[2px] border border-white/50 shadow-sm'
                  }`}
                  onDragOver={(e) => handleDragOver(e, column)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column)}
                >
                  <div className="flex items-center justify-between mb-6 px-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-6 rounded-full ${statusConfig.bgColor.replace('bg-', 'bg-')}`} style={{backgroundColor: statusConfig.color.includes('blue') ? '#3B82F6' : statusConfig.color.includes('amber') ? '#F59E0B' : statusConfig.color.includes('emerald') ? '#10B981' : '#64748B'}}></div>
                      <h3 className="font-bold text-slate-800 tracking-tight">{statusConfig.label}</h3>
                      <span className="text-[10px] font-bold bg-white/60 text-slate-500 px-2 py-0.5 rounded-full shadow-sm">
                        {columnTasks.length}
                      </span>
                    </div>
                    <button
                        onClick={() => {
                          setCreateTaskStatus(column);
                          setTaskFormError('');
                          setNewTaskForm({ title: '', description: '', priority: 'medium', dueDate: '', showDueDate: false, tags: [] });
                          setIsCreateTaskModalOpen(true);
                        }}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md active:scale-90"
                    >
                      <span className="text-xl">+</span>
                    </button>
                  </div>



                  <div className="space-y-3 transition-all duration-300">
                    {columnTasks.map((taskItem, index) => (
                      <div
                        key={taskItem.task.id}
                        className="animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {renderTaskCard(taskItem)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {isEditModalOpen && editingTask && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
              setEditingTask(null);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">Edit Task</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todo">Todo</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                <TagSelector
                  tags={tags}
                  selectedTagIds={editingTask.tags || []}
                  onChange={(newTagIds) => setEditingTask({ ...editingTask, tags: newTagIds })}
                />
              </div>

              {editingTask.dueDate && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateTaskModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateTaskModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slideUp">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">Create New Task</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  placeholder="Enter task title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  placeholder="Enter task description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as 'critical' | 'high' | 'medium' | 'low' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTaskForm.dueDate}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                <TagSelector
                  tags={tags}
                  selectedTagIds={newTaskForm.tags}
                  onChange={(newTagIds) => setNewTaskForm({ ...newTaskForm, tags: newTagIds })}
                />
              </div>

              {taskFormError && (
                <p className="text-sm text-red-600">{taskFormError}</p>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreateTaskModalOpen(false);
                  setTaskFormError('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTaskForm.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateProjectOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateProjectOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-slideUp">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-900">Create New Project</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Project name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Project description"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={newProject.projectType}
                    onChange={(e) => setNewProject({ ...newProject, projectType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="roadmap">Roadmap</option>
                    <option value="skill-tree">Skill Tree</option>
                    <option value="kanban">Kanban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newProject.targetDate}
                    onChange={(e) => setNewProject({ ...newProject, targetDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateProjectOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProject.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        projectId={selectedProject || ''}
        tags={tags}
        onTagsChange={handleTagsChange}
      />
    </div>
  );
};

export default App;
