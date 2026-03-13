import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  type OnConnect,
  type OnEdgesDelete,
} from '@xyflow/react';
import * as dagre from 'dagre';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface GraphSummary {
  id: string;
  name: string;
  description: string;
  dimension: string | null;
  revision: number;
}

interface ViewNode {
  taskId: string;
  x: number;
  y: number;
  collapsed: boolean;
  note: string | null;
}

interface ViewEdge {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  kind: 'hard';
  createdAt: string;
}

interface DependencyView {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dimension: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
  nodes: ViewNode[];
  edges: ViewEdge[];
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

interface DependencyViewsPanelProps {
  projectId: string | null;
  projectName?: string;
  tasks: TaskItem[];
  onGraphsChange: (graphs: GraphSummary[]) => void;
}

// ─── ReactFlow custom node data

interface TaskNodeData extends Record<string, unknown> {
  task: TaskItem;
  onAddNext: (taskId: string) => void;
  onRemove: (taskId: string) => void;
}

type TaskFlowNode = Node<TaskNodeData, 'taskNode'>;

// ─── Constants

const NODE_WIDTH = 300;
const NODE_HEIGHT = 130;
const LAYER_X_GAP = 350;
const LAYER_Y_GAP = 180;

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#10b981',
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  'todo': { label: 'TODO', cls: 'bg-slate-100 text-slate-600' },
  'in-progress': { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  'review': { label: 'Review', cls: 'bg-amber-100 text-amber-700' },
  'done': { label: 'Done', cls: 'bg-emerald-100 text-emerald-700' },
};

// ─── Dagre auto-layout (left-to-right)

function computeAutoLayout(nodes: TaskFlowNode[], flowEdges: Edge[]): TaskFlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', ranksep: LAYER_X_GAP - NODE_WIDTH, nodesep: LAYER_Y_GAP - NODE_HEIGHT });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  flowEdges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
  });
}

// ─── Task Node Component (defined outside main to prevent re-creation)

function TaskNodeComponent({ data }: NodeProps<TaskFlowNode>) {
  const task = data.task as TaskItem;
  const onAddNext = data.onAddNext as (id: string) => void;
  const onRemove = data.onRemove as (id: string) => void;
  const color = PRIORITY_COLORS[task.priority] ?? '#3b82f6';
  const status = STATUS_CONFIG[task.status] ?? { label: task.status, cls: 'bg-slate-100 text-slate-600' };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ width: NODE_WIDTH, border: `2px solid ${color}`, boxShadow: `0 4px 20px ${color}25` }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#94a3b8', width: 10, height: 10, border: '2px solid white' }}
      />
      {/* Priority / Status header */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: `${color}15` }}
      >
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
          {task.priority}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>
          {status.label}
        </span>
      </div>
      {/* Title + description */}
      <div className="px-4 pt-2.5 pb-1">
        <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{task.title}</p>
        {task.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
        )}
      </div>
      {/* Actions */}
      <div className="px-4 pb-3 flex items-center justify-between mt-1">
        <button
          type="button"
          className="nodrag flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-white hover:bg-emerald-500 px-2.5 py-1 rounded-lg transition-all"
          onClick={() => onAddNext(task.id)}
        >
          <span className="text-sm leading-none">+</span>
          <span>Next</span>
        </button>
        <button
          type="button"
          className="nodrag text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-all"
          title="Remove from graph"
          aria-label="Remove from graph"
          onClick={() => onRemove(task.id)}
        >
          <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#10b981', width: 10, height: 10, border: '2px solid white' }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { taskNode: TaskNodeComponent };

// ─── Main Component

export default function DependencyViewsPanel({
  projectId,
  projectName,
  tasks,
  onGraphsChange,
}: DependencyViewsPanelProps) {
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DependencyView | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [isCreateGraphOpen, setIsCreateGraphOpen] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');
  const [newGraphDesc, setNewGraphDesc] = useState('');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskSuccessorId, setAddTaskSuccessorId] = useState<string | null>(null);
  const [selectedAddTaskIds, setSelectedAddTaskIds] = useState<string[]>([]);
  const [hideCompletedInAdd, setHideCompletedInAdd] = useState(true);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<TaskFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Refs for stable callbacks (no need to re-create on projectId / selectedGraphId changes)
  const projectIdRef = useRef(projectId);
  const selectedGraphIdRef = useRef(selectedGraphId);
  projectIdRef.current = projectId;
  selectedGraphIdRef.current = selectedGraphId;

  // Load graphs when projectId changes
  useEffect(() => {
    if (!projectId) {
      setGraphs([]);
      setSelectedGraphId(null);
      setCurrentView(null);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/dependency-views`);
      const payload = await res.json() as { success: boolean; data: GraphSummary[] };
      if (payload.success) {
        setGraphs(payload.data);
        onGraphsChange(payload.data);
      }
    })();
  }, [projectId, onGraphsChange]);

  // Load selected view when selectedGraphId changes
  useEffect(() => {
    if (!projectId || !selectedGraphId) {
      setCurrentView(null);
      return;
    }
    setIsLoading(true);
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/dependency-views/${selectedGraphId}`);
      const payload = await res.json() as { success: boolean; data: DependencyView };
      if (payload.success) setCurrentView(payload.data);
      setIsLoading(false);
    })();
  }, [projectId, selectedGraphId]);

  // Stable callbacks via refs
  const handleAddNext = useCallback((taskId: string) => {
    setAddTaskSuccessorId(taskId);
    setSelectedAddTaskIds([]);
    setIsAddTaskOpen(true);
  }, []);

  const handleRemove = useCallback((taskId: string) => {
    const pid = projectIdRef.current;
    const gid = selectedGraphIdRef.current;
    if (!pid || !gid) return;
    void (async () => {
      const res = await fetch(`/api/projects/${pid}/dependency-views/${gid}/nodes/${taskId}`, {
        method: 'DELETE',
      });
      const payload = await res.json() as { success: boolean; data: DependencyView };
      if (payload.success) setCurrentView(payload.data);
    })();
  }, []);

  // Rebuild ReactFlow graph whenever the view or task list changes
  useEffect(() => {
    if (!currentView) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const rawNodes: TaskFlowNode[] = currentView.nodes
      .filter((n) => taskMap.has(n.taskId))
      .map((n) => ({
        id: n.taskId,
        type: 'taskNode' as const,
        position: { x: 0, y: 0 },
        data: {
          task: taskMap.get(n.taskId) as TaskItem,
          onAddNext: handleAddNext,
          onRemove: handleRemove,
        } as unknown as TaskNodeData,
      }));
    const rawEdges: Edge[] = currentView.edges.map((e) => ({
      id: e.id,
      source: e.fromTaskId,
      target: e.toTaskId,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));
    const finalNodes = rawNodes.length > 0 ? computeAutoLayout(rawNodes, rawEdges) : rawNodes;
    setNodes(finalNodes);
    setEdges(rawEdges);
  }, [currentView, tasks, handleAddNext, handleRemove, setNodes, setEdges]);

  // Drag connect between handles
  const handleConnect: OnConnect = useCallback((connection) => {
    const pid = projectIdRef.current;
    const gid = selectedGraphIdRef.current;
    if (!pid || !gid || !connection.source || !connection.target) return;
    void (async () => {
      const res = await fetch(`/api/projects/${pid}/dependency-views/${gid}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: connection.source, toTaskId: connection.target }),
      });
      const payload = await res.json() as { success: boolean; data: DependencyView };
      if (payload.success) setCurrentView(payload.data);
    })();
  }, []);

  // Delete edges via keyboard
  const handleEdgesDelete: OnEdgesDelete = useCallback((deletedEdges) => {
    const pid = projectIdRef.current;
    const gid = selectedGraphIdRef.current;
    if (!pid || !gid) return;
    void (async () => {
      for (const edge of deletedEdges) {
        const res = await fetch(`/api/projects/${pid}/dependency-views/${gid}/edges/${edge.id}`, {
          method: 'DELETE',
        });
        const payload = await res.json() as { success: boolean; data: DependencyView };
        if (payload.success) setCurrentView(payload.data);
      }
    })();
  }, []);

  // Create graph
  const handleCreateGraph = useCallback(async () => {
    const pid = projectIdRef.current;
    if (!pid || !newGraphName.trim()) return;
    const res = await fetch(`/api/projects/${pid}/dependency-views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGraphName.trim(), description: newGraphDesc }),
    });
    const payload = await res.json() as { success: boolean; data: DependencyView };
    if (payload.success) {
      const v = payload.data;
      const summary: GraphSummary = {
        id: v.id, name: v.name, description: v.description,
        dimension: v.dimension, revision: v.revision,
      };
      const updated = [...graphs, summary];
      setGraphs(updated);
      onGraphsChange(updated);
      setSelectedGraphId(v.id);
      setNewGraphName('');
      setNewGraphDesc('');
      setIsCreateGraphOpen(false);
    }
  }, [newGraphName, newGraphDesc, graphs, onGraphsChange]);

  // Delete graph
  const handleDeleteGraph = useCallback(async (graphId: string) => {
    const pid = projectIdRef.current;
    if (!pid || !confirm('Delete this dependency graph? This cannot be undone.')) return;
    const res = await fetch(`/api/projects/${pid}/dependency-views/${graphId}`, { method: 'DELETE' });
    if (res.ok) {
      const updated = graphs.filter((g) => g.id !== graphId);
      setGraphs(updated);
      onGraphsChange(updated);
      if (selectedGraphId === graphId) {
        setSelectedGraphId(updated.length > 0 ? updated[0].id : null);
      }
    }
  }, [graphs, onGraphsChange, selectedGraphId]);

  // Add task to graph (optionally with a successor edge)
  // Add tasks to graph (batch; optionally all as successors of addTaskSuccessorId)
  const handleAddTask = useCallback(async () => {
    const pid = projectIdRef.current;
    const gid = selectedGraphIdRef.current;
    if (!pid || !gid || selectedAddTaskIds.length === 0) return;
    let updatedView: DependencyView | null = null;
    for (const taskId of selectedAddTaskIds) {
      const addRes = await fetch(`/api/projects/${pid}/dependency-views/${gid}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const addPayload = await addRes.json() as { success: boolean; data: DependencyView; error?: string };
      if (!addPayload.success) { alert(addPayload.error ?? `Failed to add task ${taskId}`); continue; }
      updatedView = addPayload.data;
      if (addTaskSuccessorId) {
        const edgeRes = await fetch(`/api/projects/${pid}/dependency-views/${gid}/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromTaskId: addTaskSuccessorId, toTaskId: taskId }),
        });
        const edgePayload = await edgeRes.json() as { success: boolean; data: DependencyView };
        if (edgePayload.success) updatedView = edgePayload.data;
      }
    }
    if (updatedView) setCurrentView(updatedView);
    setIsAddTaskOpen(false);
    setAddTaskSuccessorId(null);
    setSelectedAddTaskIds([]);
  }, [selectedAddTaskIds, addTaskSuccessorId]);

  // Tasks not yet in the current view
  const availableTasksForAdd = useMemo(() => {
    if (!currentView) return tasks;
    const inGraph = new Set(currentView.nodes.map((n) => n.taskId));
    return tasks.filter((t) => {
      if (inGraph.has(t.id)) return false;
      if (hideCompletedInAdd && t.status === 'done') return false;
      return true;
    });
  }, [tasks, currentView, hideCompletedInAdd]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-slate-400">
          <div className="text-5xl mb-4">🖥️</div>
          <p className="font-semibold text-slate-500">Select a project to manage dependency graphs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-10rem)]">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graphs</h2>
            {projectName && (
              <p className="text-xs text-slate-600 font-semibold truncate mt-0.5">{projectName}</p>
            )}
          </div>
            <button
              type="button"
              onClick={() => setIsCreateGraphOpen(true)}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:scale-95 transition-all shadow-sm shadow-emerald-500/30 text-xl leading-none ml-2"
              title="Create new graph"
          >+</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {graphs.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-xs font-medium">No graphs yet</p>
              <p className="text-xs text-slate-300">Click + to create one</p>
            </div>
          ) : graphs.map((graph) => (
            <div key={graph.id} className="group relative">
              <button
                type="button"
                onClick={() => setSelectedGraphId(graph.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                  selectedGraphId === graph.id
                    ? 'bg-white shadow-md ring-1 ring-slate-100 text-slate-900 font-bold'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
                }`}
              >
                <div className="truncate pr-5">{graph.name}</div>
                <div className={`text-[10px] mt-0.5 font-bold px-2 py-0.5 rounded-full inline-block ${selectedGraphId === graph.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  rev {graph.revision}{selectedGraphId === graph.id && currentView ? ` · ${currentView.nodes.length} nodes` : ''}
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void handleDeleteGraph(graph.id); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-rose-50"
                title="Delete graph"
                aria-label="Delete graph"
              >
                <svg aria-hidden="true" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 relative rounded-2xl overflow-hidden shadow-sm border border-white/50 bg-slate-50">
        {!selectedGraphId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <div className="text-5xl mb-4">🗺️</div>
              <p className="font-semibold text-slate-500">
                {graphs.length === 0 ? 'Create a graph to get started' : 'Select a graph to view'}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <div className="text-3xl mb-3 animate-spin">⟳</div>
              <p className="text-sm font-medium">Loading graph…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar overlay */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setAddTaskSuccessorId(null); setSelectedAddTaskIds([]); setIsAddTaskOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-emerald-200 hover:shadow-md text-xs font-bold text-slate-700 transition-all"
              >
                <span className="text-emerald-500 text-sm leading-none">+</span> Add Task
              </button>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onEdgesDelete={handleEdgesDelete}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
              deleteKeyCode="Delete"
            >
              <Background gap={24} color="#e2e8f0" />
              <Controls className="!rounded-xl !shadow-md !border-0 !bg-white" />
            </ReactFlow>

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-4xl mb-3">✨</div>
                  <p className="text-sm font-semibold text-slate-500">No tasks in this graph yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click “Add Task” above to add nodes</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isCreateGraphOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create Dependency Graph</h2>
              <p className="text-sm text-slate-500 mt-0.5">Visualize task dependencies as a directed graph</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="dependency-graph-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Graph Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="dependency-graph-name"
                  type="text"
                  value={newGraphName}
                  onChange={(e) => setNewGraphName(e.target.value)}
                  placeholder="e.g. Sprint 1 Dependencies"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                  onKeyDown={(e) => { if (e.key === 'Enter' && newGraphName.trim()) void handleCreateGraph(); }}
                />
              </div>
              <div>
                <label htmlFor="dependency-graph-description" className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea
                  id="dependency-graph-description"
                  value={newGraphDesc}
                  onChange={(e) => setNewGraphDesc(e.target.value)}
                  placeholder="Optional description…"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none transition-all"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateGraphOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={() => void handleCreateGraph()}
                disabled={!newGraphName.trim()}
                className="px-5 py-2 text-sm font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-500/20"
              >Create Graph</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isAddTaskOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {addTaskSuccessorId ? 'Add Next Task' : 'Add Task to Graph'}
              </h2>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-slate-500">
                  {addTaskSuccessorId
                    ? 'The selected tasks will be connected as successors'
                    : `${availableTasksForAdd.length} task${availableTasksForAdd.length !== 1 ? 's' : ''} available`}
                </p>
                <button
                  type="button"
                  onClick={() => setHideCompletedInAdd(!hideCompletedInAdd)}
                  className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                >
                  {hideCompletedInAdd ? 'Show Done' : 'Hide Done'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {availableTasksForAdd.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="font-medium text-sm">All tasks are already in this graph</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {availableTasksForAdd.map((task) => {
                    const color = PRIORITY_COLORS[task.priority] ?? '#94a3b8';
                    return (
                      <button
                        type="button"
                        key={task.id}
                        onClick={() => {
                          const isSelected = selectedAddTaskIds.includes(task.id);
                          setSelectedAddTaskIds(isSelected
                            ? selectedAddTaskIds.filter((id) => id !== task.id)
                            : [...selectedAddTaskIds, task.id]);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border-2 ${
                          selectedAddTaskIds.includes(task.id)
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-slate-800 truncate">{task.title}</span>
                          {selectedAddTaskIds.includes(task.id) && (
                            <span className="ml-auto text-emerald-500 flex-shrink-0">✓</span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1.5 ml-5 line-clamp-1">{task.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsAddTaskOpen(false); setAddTaskSuccessorId(null); setSelectedAddTaskIds([]); }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >Cancel</button>
              <button
                type="button"
                onClick={() => void handleAddTask()}
                disabled={selectedAddTaskIds.length === 0 || availableTasksForAdd.length === 0}
                className="px-5 py-2 text-sm font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm shadow-emerald-500/20"
              >{selectedAddTaskIds.length > 0 ? `Add ${selectedAddTaskIds.length} Task${selectedAddTaskIds.length > 1 ? 's' : ''} to Graph` : 'Add to Graph'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
