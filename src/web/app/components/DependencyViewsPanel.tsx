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
  type EdgeProps,
  type EdgeTypes,
  type NodeTypes,
  type NodeProps,
  type OnConnect,
  type OnEdgesDelete,
  type EdgeMouseHandler,
  type ReactFlowInstance,
} from '@xyflow/react';
import ELK, { type ElkEdgeSection, type ElkExtendedEdge, type ElkNode, type ElkPoint, type ElkPort, type LayoutOptions } from 'elkjs/lib/elk.bundled.js';
import { toPng } from 'html-to-image';

import { getItem, removeItem, setItem, STORAGE_KEYS } from '../utils/storage.js';
import TagBadge from './TagBadge.js';
import TagSelector from './TagSelector.js';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface GraphSummary {
  id: string;
  name: string;
  description: string;
  dimension: string | null;
  revision: number;
  nodeCount: number;
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

interface DependencyViewMutationResponse {
  view: DependencyView;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  tags: string[];
}

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
type TaskPriority = TaskItem['priority'];

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface LayoutedEdgeData extends Record<string, unknown> {
  path: string;
  sourceStatus: string;
}

type DisplayMode = 'compact' | 'detailed';

interface DependencyViewsPanelProps {
  projectId: string | null;
  projectName?: string;
  displayMode: DisplayMode;
  tasks: TaskItem[];
  tags: TagItem[];
  onGraphsChange: (graphs: GraphSummary[]) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => Promise<boolean>;
  onCreateTask: (input: {
    title: string;
    description: string;
    priority: TaskPriority;
    tags: string[];
  }) => Promise<TaskItem | null>;
}

type SavedGraphSelections = Record<string, string>;
type TaskFlowEdge = Edge<LayoutedEdgeData, 'layoutedEdge'>;

const elk = new ELK();
const GRAPH_MOTION_STYLES = `
  @keyframes dependency-edge-flow {
    to {
      stroke-dashoffset: -52;
    }
  }

  @keyframes dependency-ready-glow {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.12), 0 16px 36px rgba(15, 23, 42, 0.12);
    }

    50% {
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.1), 0 22px 44px rgba(16, 185, 129, 0.2);
    }
  }

  .dependency-edge-flow {
    animation: dependency-edge-flow 1.2s linear infinite;
  }

  .dependency-ready-card {
    animation: dependency-ready-glow 1.8s ease-in-out infinite;
  }
`;

function normalizeDependencyView(
  payload: DependencyView | DependencyViewMutationResponse | null | undefined
): DependencyView | null {
  const view = payload && 'view' in payload ? payload.view : payload;
  if (!view) {
    return null;
  }

  return {
    ...view,
    nodes: Array.isArray(view.nodes) ? view.nodes : [],
    edges: Array.isArray(view.edges) ? view.edges : [],
  };
}

// ─── ReactFlow custom node data

interface TaskNodeData extends Record<string, unknown> {
  task: TaskItem;
  tagMap: Record<string, TagItem>;
  isDone: boolean;
  isReady: boolean;
  displayMode: DisplayMode;
  onAddNext: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<boolean>;
  isStatusUpdating: boolean;
}

type TaskFlowNode = Node<TaskNodeData, 'taskNode'>;

// ─── Constants

const DISPLAY_MODE_CONFIG: Record<DisplayMode, { nodeWidth: number; nodeHeight: number; layerXGap: number; layerYGap: number }> = {
  compact: {
    nodeWidth: 276,
    nodeHeight: 108,
    layerXGap: 78,
    layerYGap: 144,
  },
  detailed: {
    nodeWidth: 328,
    nodeHeight: 168,
    layerXGap: 88,
    layerYGap: 220,
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#d97706',
  medium: '#3b82f6',
  low: '#10b981',
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  'todo': { label: 'TODO', cls: 'bg-slate-100 text-slate-600' },
  'in-progress': { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
  'review': { label: 'Review', cls: 'bg-amber-100 text-amber-700' },
  'done': { label: 'Done', cls: 'bg-emerald-100 text-emerald-700' },
};

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

function buildRoundedOrthogonalPath(points: ElkPoint[], radius = 12): string {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x},${points[0].y}`;
  }

  const commands: string[] = [`M ${points[0].x},${points[0].y}`];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (!next) {
      commands.push(`L ${current.x},${current.y}`);
      continue;
    }

    const incomingDx = current.x - previous.x;
    const incomingDy = current.y - previous.y;
    const outgoingDx = next.x - current.x;
    const outgoingDy = next.y - current.y;
    const incomingLength = Math.hypot(incomingDx, incomingDy);
    const outgoingLength = Math.hypot(outgoingDx, outgoingDy);

    if (incomingLength === 0 || outgoingLength === 0) {
      commands.push(`L ${current.x},${current.y}`);
      continue;
    }

    const segmentRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const beforeX = current.x - (incomingDx / incomingLength) * segmentRadius;
    const beforeY = current.y - (incomingDy / incomingLength) * segmentRadius;
    const afterX = current.x + (outgoingDx / outgoingLength) * segmentRadius;
    const afterY = current.y + (outgoingDy / outgoingLength) * segmentRadius;

    commands.push(`L ${beforeX},${beforeY}`);
    commands.push(`Q ${current.x},${current.y} ${afterX},${afterY}`);
  }

  return commands.join(' ');
}

function centerOrthogonalBends(points: ElkPoint[]): ElkPoint[] {
  if (points.length < 4) {
    return points;
  }

  const normalized = points.map((point) => ({ ...point }));

  const isHorizontal = (from: ElkPoint, to: ElkPoint): boolean => from.y === to.y && from.x !== to.x;
  const isVertical = (from: ElkPoint, to: ElkPoint): boolean => from.x === to.x && from.y !== to.y;

  for (let index = 1; index < normalized.length - 1; index += 1) {
    if (!isVertical(normalized[index], normalized[index + 1])) {
      continue;
    }

    let runStart = index;
    let runEnd = index + 1;

    while (runEnd < normalized.length - 1 && isVertical(normalized[runEnd], normalized[runEnd + 1])) {
      runEnd += 1;
    }

    let leftAnchorIndex = runStart - 1;
    if (leftAnchorIndex < 0 || !isHorizontal(normalized[leftAnchorIndex], normalized[runStart])) {
      index = runEnd;
      continue;
    }

    while (leftAnchorIndex > 0 && isHorizontal(normalized[leftAnchorIndex - 1], normalized[leftAnchorIndex])) {
      leftAnchorIndex -= 1;
    }

    let rightAnchorIndex = runEnd + 1;
    if (rightAnchorIndex >= normalized.length || !isHorizontal(normalized[runEnd], normalized[rightAnchorIndex])) {
      index = runEnd;
      continue;
    }

    while (rightAnchorIndex < normalized.length - 1 && isHorizontal(normalized[rightAnchorIndex], normalized[rightAnchorIndex + 1])) {
      rightAnchorIndex += 1;
    }

    const midpointX = (normalized[leftAnchorIndex].x + normalized[rightAnchorIndex].x) / 2;
    for (let pointIndex = runStart; pointIndex <= runEnd; pointIndex += 1) {
      normalized[pointIndex] = { ...normalized[pointIndex], x: midpointX };
    }

    index = runEnd;
  }

  return normalized;
}

function buildEdgePath(points: ElkPoint[]): string {
  return buildRoundedOrthogonalPath(centerOrthogonalBends(points));
}

function getSectionPoints(section: ElkEdgeSection): ElkPoint[] {
  return [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
}

function getEdgePalette(status: string, isSelected: boolean): {
  stroke: string;
  strokeWidth: number;
  animated: boolean;
  opacity: number;
} {
  if (isSelected) {
    return {
      stroke: '#10b981',
      strokeWidth: 3,
      animated: false,
      opacity: 1,
    };
  }

  switch (status) {
    case 'in-progress':
      return {
        stroke: '#2563eb',
        strokeWidth: 2.75,
        animated: true,
        opacity: 0.95,
      };
    case 'review':
      return {
        stroke: '#d97706',
        strokeWidth: 2.75,
        animated: true,
        opacity: 0.95,
      };
    case 'done':
      return {
        stroke: '#94a3b8',
        strokeWidth: 2,
        animated: false,
        opacity: 0.7,
      };
    default:
      return {
        stroke: '#94a3b8',
        strokeWidth: 2,
        animated: false,
        opacity: 0.9,
      };
  }
}

function buildElkLayoutOptions(config: {
  nodeWidth: number;
  nodeHeight: number;
  layerXGap: number;
  layerYGap: number;
}): LayoutOptions {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.max(config.layerXGap, 48)),
    'elk.spacing.nodeNode': String(Math.max(config.layerYGap - config.nodeHeight + 48, 64)),
    'elk.spacing.edgeEdge': '12',
    'elk.spacing.edgeNode': '14',
    'elk.layered.spacing.edgeNodeBetweenLayers': '14',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.nodePlacement.favorStraightEdges': 'true',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.layered.unnecessaryBendpoints': 'true',
    'elk.layered.highDegreeNodes.treatment': 'true',
    'elk.layered.highDegreeNodes.threshold': '6',
    'elk.portConstraints': 'FIXED_ORDER',
  };
}

async function computeAutoLayout(
  nodes: TaskFlowNode[],
  viewEdges: ViewEdge[],
  taskMap: Map<string, TaskItem>,
  selectedEdgeId: string | null,
  config: { nodeWidth: number; nodeHeight: number; layerXGap: number; layerYGap: number }
): Promise<{ nodes: TaskFlowNode[]; edges: TaskFlowEdge[] }> {
  const portsByNode = new Map<string, { in: ElkPort; out: ElkPort }>();
  const elkNodes: ElkNode[] = nodes.map((node) => {
    const ports = {
      in: {
        id: `${node.id}__in`,
        width: 12,
        height: 12,
        layoutOptions: {
          'elk.port.side': 'WEST',
          'elk.port.index': '0',
        },
      },
      out: {
        id: `${node.id}__out`,
        width: 12,
        height: 12,
        layoutOptions: {
          'elk.port.side': 'EAST',
          'elk.port.index': '1',
        },
      },
    };
    portsByNode.set(node.id, ports);
    return {
      id: node.id,
      width: config.nodeWidth,
      height: config.nodeHeight,
      layoutOptions: {
        'elk.portConstraints': 'FIXED_ORDER',
      },
      ports: [ports.in, ports.out],
    };
  });

  const elkEdges: ElkExtendedEdge[] = viewEdges.flatMap((edge) => {
    const sourcePorts = portsByNode.get(edge.fromTaskId);
    const targetPorts = portsByNode.get(edge.toTaskId);
    if (!sourcePorts || !targetPorts) {
      return [];
    }

    return [{
      id: edge.id,
      sources: [sourcePorts.out.id],
      targets: [targetPorts.in.id],
    }];
  });

  const layoutedGraph = await elk.layout({
    id: 'dependency-view-root',
    layoutOptions: buildElkLayoutOptions(config),
    children: elkNodes,
    edges: elkEdges,
  });

  const layoutedNodeMap = new Map<string, ElkNode>(
    (layoutedGraph.children ?? []).map((layoutedNode: ElkNode) => [layoutedNode.id, layoutedNode])
  );
  const finalNodes = nodes.map((node) => {
    const layoutedNode = layoutedNodeMap.get(node.id);
    if (!layoutedNode || layoutedNode.x === undefined || layoutedNode.y === undefined) {
      return node;
    }

    return {
      ...node,
      position: { x: layoutedNode.x, y: layoutedNode.y },
    };
  });

  const finalEdges: TaskFlowEdge[] = elkEdges.map((edge) => {
    const originalEdge = viewEdges.find((viewEdge) => viewEdge.id === edge.id);
    const layoutedEdge = (layoutedGraph.edges ?? []).find((layoutedItem: ElkExtendedEdge) => layoutedItem.id === edge.id);
    const section = layoutedEdge?.sections?.[0];
    const points = section ? getSectionPoints(section) : [];
    const sourceTaskStatus = originalEdge ? (taskMap.get(originalEdge.fromTaskId)?.status ?? 'todo') : 'todo';
    const palette = getEdgePalette(sourceTaskStatus, selectedEdgeId === edge.id);

    return {
      id: edge.id,
      source: originalEdge?.fromTaskId ?? '',
      target: originalEdge?.toTaskId ?? '',
      type: 'layoutedEdge',
      markerEnd: { type: MarkerType.ArrowClosed, color: palette.stroke },
      animated: palette.animated,
      style: {
        stroke: palette.stroke,
        strokeWidth: palette.strokeWidth,
        opacity: palette.opacity,
      },
      data: {
        path: buildEdgePath(points),
        sourceStatus: sourceTaskStatus,
      },
    };
  });

  return {
    nodes: finalNodes,
    edges: finalEdges,
  };
}

function LayoutedEdgeComponent({ id, data, markerEnd, style, interactionWidth }: EdgeProps<TaskFlowEdge>) {
  const path = typeof data?.path === 'string' ? data.path : '';
  if (!path) {
    return null;
  }

  const sourceStatus = typeof data?.sourceStatus === 'string' ? data.sourceStatus : 'todo';
  const stroke = typeof style?.stroke === 'string' ? style.stroke : '#94a3b8';
  const strokeWidth = typeof style?.strokeWidth === 'number' ? style.strokeWidth : 2;
  const opacity = typeof style?.opacity === 'number' ? style.opacity : 1;
  const isAnimated = sourceStatus === 'in-progress' || sourceStatus === 'review';
  const glowStroke = sourceStatus === 'review'
    ? 'rgba(217, 119, 6, 0.26)'
    : sourceStatus === 'in-progress'
      ? 'rgba(37, 99, 235, 0.24)'
      : 'rgba(148, 163, 184, 0.18)';

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={glowStroke}
        strokeWidth={strokeWidth + 8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isAnimated ? 0.85 : 0.35}
      />
      <path
        id={id}
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
        markerEnd={markerEnd}
      />
      {isAnimated && (
        <path
          d={path}
          fill="none"
          stroke="#ffffff"
          strokeWidth={Math.max(strokeWidth - 0.2, 1.6)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="14 12"
          className="dependency-edge-flow"
          markerEnd={markerEnd}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(interactionWidth ?? 20, strokeWidth + 16)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ─── Task Node Component (defined outside main to prevent re-creation)

function TaskNodeComponent({ data }: NodeProps<TaskFlowNode>) {
  const task = data.task as TaskItem;
  const tagMap = data.tagMap as Record<string, TagItem>;
  const isDone = data.isDone as boolean;
  const isReady = data.isReady as boolean;
  const displayMode = data.displayMode as DisplayMode;
  const onAddNext = data.onAddNext as (id: string) => void;
  const onRemove = data.onRemove as (id: string) => void;
  const onStatusChange = data.onStatusChange as (taskId: string, status: TaskStatus) => Promise<boolean>;
  const isStatusUpdating = data.isStatusUpdating as boolean;
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const statusButtonRef = useRef<HTMLButtonElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const color = PRIORITY_COLORS[task.priority] ?? '#3b82f6';
  const status = STATUS_CONFIG[task.status] ?? { label: task.status, cls: 'bg-slate-100 text-slate-600' };
  const layout = DISPLAY_MODE_CONFIG[displayMode];
  const isCompact = displayMode === 'compact';
  const readinessState = isDone ? 'done' : isReady ? 'ready' : 'blocked';
  const readinessBadge = isDone
    ? { label: 'Completed', cls: 'bg-slate-200 text-slate-600', iconCls: 'text-slate-500' }
    : isReady
      ? { label: 'Ready', cls: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30', iconCls: 'text-white/90' }
      : { label: 'Waiting', cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200', iconCls: 'text-amber-500' };
  const surfaceStyle = isDone
    ? {
        width: layout.nodeWidth,
        border: `2px solid ${color}`,
        boxShadow: `0 2px 10px ${color}18`,
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        opacity: 0.55,
      }
    : isReady
      ? {
          width: layout.nodeWidth,
          border: `2px solid ${color}`,
          background: `linear-gradient(135deg, ${color}18 0%, #ffffff 34%, #f8fafc 100%)`,
          boxShadow: `0 0 0 5px ${color}16, 0 18px 40px ${color}30`,
          transform: 'translateY(-3px)',
        }
      : {
          width: layout.nodeWidth,
          border: `2px solid ${color}70`,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
           opacity: 0.92,
           filter: 'saturate(0.85)',
         };

  const updateMenuPosition = useCallback(() => {
    const button = statusButtonRef.current;
    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const width = Math.max(rect.width + 48, 176);
    setMenuStyle({
      top: rect.bottom + 10,
      left: Math.max(12, rect.right - width),
      width,
    });
  }, []);

  useEffect(() => {
    if (!isStatusMenuOpen) {
      return;
    }

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (statusButtonRef.current?.contains(target) || statusMenuRef.current?.contains(target)) {
        return;
      }

      setIsStatusMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStatusMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isStatusMenuOpen, updateMenuPosition]);

  useEffect(() => {
    if (isStatusUpdating) {
      setIsStatusMenuOpen(false);
    }
  }, [isStatusUpdating]);

  const handleStatusToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isStatusUpdating) {
      return;
    }

    if (!isStatusMenuOpen) {
      updateMenuPosition();
    }
    setIsStatusMenuOpen((value) => !value);
  };

  const handleStatusSelect = async (nextStatus: TaskStatus) => {
    if (nextStatus === task.status) {
      setIsStatusMenuOpen(false);
      return;
    }

    const success = await onStatusChange(task.id, nextStatus);
    if (success) {
      setIsStatusMenuOpen(false);
    }
  };

  const readinessIcon = isDone
    ? (
        <svg aria-hidden="true" className={`h-3 w-3 ${readinessBadge.iconCls}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M5 13l4 4L19 7" />
        </svg>
      )
    : isReady
      ? (
          <svg aria-hidden="true" className={`h-3 w-3 ${readinessBadge.iconCls}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
          </svg>
        )
      : (
          <svg aria-hidden="true" className={`h-3 w-3 ${readinessBadge.iconCls}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );

  return (
    <>
      <div
      className={`bg-white rounded-2xl ${readinessState === 'ready' ? 'dependency-ready-card' : ''}`}
      style={surfaceStyle}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#94a3b8', width: 10, height: 10, border: '2px solid white' }}
      />
      {/* Priority / Status header */}
      <div
        className="px-4 py-2.5"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="pt-1 text-[10px] font-black uppercase tracking-widest" style={{ color }}>
            {task.priority}
          </span>
          <div className="flex max-w-[70%] flex-wrap justify-end gap-1.5">
            <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${readinessBadge.cls}`}>
              {readinessIcon}
              {readinessBadge.label}
            </span>
            <button
              ref={statusButtonRef}
              type="button"
              onClick={handleStatusToggle}
              disabled={isStatusUpdating}
              className={`nodrag nopan inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold transition-all ${status.cls} ${isStatusUpdating ? 'cursor-wait opacity-70' : 'cursor-pointer hover:ring-2 hover:ring-slate-200'}`}
              aria-haspopup="menu"
              aria-expanded={isStatusMenuOpen}
              title="Change task status"
            >
              {status.label}
              <svg aria-hidden="true" className="h-3 w-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Title + description */}
      <div className="px-4 pt-2.5 pb-1">
        <p className={`font-bold text-slate-800 leading-snug line-clamp-2 ${isCompact ? 'text-[13px]' : 'text-sm'}`}>{task.title}</p>
        {!isCompact && task.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
        )}
        {!isCompact && task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.map((tagId) => {
              const tag = tagMap[tagId];
              if (!tag) {
                return null;
              }

              return (
                <TagBadge
                  key={tagId}
                  name={tag.name}
                  color={tag.color}
                  size="sm"
                  className="rounded-lg font-bold"
                />
              );
            })}
          </div>
        )}
      </div>
      {/* Actions */}
      <div className={`px-4 pb-3 flex items-center justify-between ${isCompact ? 'mt-0.5' : 'mt-1'}`}>
        <button
          type="button"
          className={`nodrag flex items-center gap-1 font-bold text-emerald-600 hover:text-white hover:bg-emerald-500 rounded-lg transition-all ${isCompact ? 'text-[11px] px-2 py-1' : 'text-xs px-2.5 py-1'}`}
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
      {isStatusMenuOpen && menuStyle && createPortal(
        <div
          ref={statusMenuRef}
          className="rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-md"
          style={{
            position: 'fixed',
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            zIndex: 80,
          }}
        >
          <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Set Status</p>
          <div className="space-y-1">
            {STATUS_OPTIONS.map((option) => {
              const optionConfig = STATUS_CONFIG[option];
              const isCurrent = option === task.status;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => void handleStatusSelect(option)}
                  disabled={isStatusUpdating}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${isCurrent ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'} disabled:cursor-wait disabled:opacity-60`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${optionConfig.cls}`} />
                    <span>{optionConfig.label}</span>
                  </span>
                  {isCurrent && <span className="text-[10px] font-black uppercase tracking-wide">Current</span>}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const nodeTypes: NodeTypes = { taskNode: TaskNodeComponent };
const edgeTypes: EdgeTypes = { layoutedEdge: LayoutedEdgeComponent };

// ─── Main Component

export default function DependencyViewsPanel({
  projectId,
  projectName,
  displayMode,
  tasks,
  tags,
  onGraphsChange,
  onTaskStatusChange,
  onCreateTask,
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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isUpdatingEdge, setIsUpdatingEdge] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isGraphListCollapsed, setIsGraphListCollapsed] = useState(
    () => getItem<boolean>(STORAGE_KEYS.GRAPH_SIDEBAR_COLLAPSED) ?? false
  );
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isQuickCreateTaskOpen, setIsQuickCreateTaskOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [quickCreateTaskError, setQuickCreateTaskError] = useState('');
  const [quickCreateTaskForm, setQuickCreateTaskForm] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    tags: string[];
  }>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
  });

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<TaskFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Refs for stable callbacks (no need to re-create on projectId / selectedGraphId changes)
  const projectIdRef = useRef(projectId);
  const selectedGraphIdRef = useRef(selectedGraphId);
  const selectedEdgeIdRef = useRef<string | null>(selectedEdgeId);
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<TaskFlowNode, Edge> | null>(null);
  projectIdRef.current = projectId;
  selectedGraphIdRef.current = selectedGraphId;
  selectedEdgeIdRef.current = selectedEdgeId;
  const tagMap = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag])),
    [tags]
  );

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
      const payload = await res.json() as { success: boolean; data: Array<GraphSummary & { nodes: ViewNode[] }> };
      if (payload.success) {
        const nextGraphs = payload.data.map((graph) => ({
          ...graph,
          nodeCount: graph.nodes.length,
        }));
        setGraphs(nextGraphs);
        onGraphsChange(nextGraphs);
        setSelectedGraphId((current) => {
          if (current && nextGraphs.some((graph) => graph.id === current)) {
            return current;
          }
          const savedSelections = getItem<SavedGraphSelections>(STORAGE_KEYS.SELECTED_GRAPH_BY_PROJECT);
          const savedGraphId = projectId ? savedSelections?.[projectId] : null;
          if (savedGraphId && nextGraphs.some((graph) => graph.id === savedGraphId)) {
            return savedGraphId;
          }
          return nextGraphs[0]?.id ?? null;
        });
      }
    })();
  }, [projectId, onGraphsChange]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const savedSelections = getItem<SavedGraphSelections>(STORAGE_KEYS.SELECTED_GRAPH_BY_PROJECT) ?? {};

    if (selectedGraphId) {
      if (savedSelections[projectId] === selectedGraphId) {
        return;
      }

      setItem(STORAGE_KEYS.SELECTED_GRAPH_BY_PROJECT, {
        ...savedSelections,
        [projectId]: selectedGraphId,
      });
      return;
    }

    if (!(projectId in savedSelections)) {
      return;
    }

    const { [projectId]: _removedSelection, ...restSelections } = savedSelections;
    if (Object.keys(restSelections).length === 0) {
      removeItem(STORAGE_KEYS.SELECTED_GRAPH_BY_PROJECT);
      return;
    }

    setItem(STORAGE_KEYS.SELECTED_GRAPH_BY_PROJECT, restSelections);
  }, [projectId, selectedGraphId]);

  useEffect(() => {
    setItem(STORAGE_KEYS.GRAPH_SIDEBAR_COLLAPSED, isGraphListCollapsed);
  }, [isGraphListCollapsed]);

  // Load selected view when selectedGraphId changes
  useEffect(() => {
    if (!projectId || !selectedGraphId) {
      setCurrentView(null);
      setSelectedEdgeId(null);
      return;
    }
    setIsLoading(true);
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/dependency-views/${selectedGraphId}`);
      const payload = await res.json() as { success: boolean; data: DependencyView | DependencyViewMutationResponse };
      if (payload.success) {
        setCurrentView(normalizeDependencyView(payload.data));
      }
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
      const payload = await res.json() as { success: boolean; data: DependencyView | DependencyViewMutationResponse };
      if (payload.success) {
        setCurrentView(normalizeDependencyView(payload.data));
      }
    })();
  }, []);

  const resetQuickCreateTaskForm = useCallback(() => {
    setQuickCreateTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      tags: [],
    });
    setQuickCreateTaskError('');
  }, []);

  const handleOpenQuickCreateTask = useCallback(() => {
    resetQuickCreateTaskForm();
    setIsQuickCreateTaskOpen(true);
  }, [resetQuickCreateTaskForm]);

  const handleCloseQuickCreateTask = useCallback(() => {
    setIsQuickCreateTaskOpen(false);
    resetQuickCreateTaskForm();
  }, [resetQuickCreateTaskForm]);

  const handleTaskStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    setUpdatingTaskId(taskId);
    try {
      return await onTaskStatusChange(taskId, status);
    } finally {
      setUpdatingTaskId((current) => (current === taskId ? null : current));
    }
  }, [onTaskStatusChange]);

  const handleQuickCreateTask = useCallback(async () => {
    const title = quickCreateTaskForm.title.trim();
    if (!title) {
      setQuickCreateTaskError('Title is required.');
      return;
    }
    if (title.length < 3) {
      setQuickCreateTaskError('Title must be at least 3 characters.');
      return;
    }
    if (title.length > 120) {
      setQuickCreateTaskError('Title must be 120 characters or fewer.');
      return;
    }

    setIsCreatingTask(true);
    try {
      const createdTask = await onCreateTask({
        title,
        description: quickCreateTaskForm.description,
        priority: quickCreateTaskForm.priority,
        tags: quickCreateTaskForm.tags,
      });

      if (!createdTask) {
        setQuickCreateTaskError('Failed to create task. Please try again.');
        return;
      }

      setSelectedAddTaskIds((current) => (current.includes(createdTask.id) ? current : [...current, createdTask.id]));
      setIsQuickCreateTaskOpen(false);
      resetQuickCreateTaskForm();
    } catch (error) {
      console.error('Failed to create task from graph modal:', error);
      setQuickCreateTaskError('Failed to create task. Please try again.');
    } finally {
      setIsCreatingTask(false);
    }
  }, [onCreateTask, quickCreateTaskForm, resetQuickCreateTaskForm]);

  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    const pid = projectIdRef.current;
    const gid = selectedGraphIdRef.current;
    if (!pid || !gid) return;

    setIsUpdatingEdge(true);
    try {
      const res = await fetch(`/api/projects/${pid}/dependency-views/${gid}/edges/${edgeId}`, {
        method: 'DELETE',
      });
      const payload = await res.json() as {
        success?: boolean;
        data?: DependencyView | DependencyViewMutationResponse;
        error?: string;
      };
      const nextView = normalizeDependencyView(payload.data);
      if (!res.ok || !payload.success || !nextView) {
        alert(payload.error ?? 'Failed to delete edge');
        return;
      }
      setCurrentView(nextView);
      setSelectedEdgeId(null);
    } finally {
      setIsUpdatingEdge(false);
    }
  }, []);

  const handleReverseEdge = useCallback(async (edgeId: string) => {
    const pid = projectIdRef.current;
    const gid = selectedGraphIdRef.current;
    const view = currentView;
    if (!pid || !gid || !view) return;

    const edge = view.edges.find((item) => item.id === edgeId);
    if (!edge) return;

    setIsUpdatingEdge(true);
    try {
      const updateRes = await fetch(`/api/projects/${pid}/dependency-views/${gid}/edges/${edgeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTaskId: edge.toTaskId, toTaskId: edge.fromTaskId }),
      });
      const updatePayload = await updateRes.json() as {
        success?: boolean;
        data?: DependencyView | DependencyViewMutationResponse;
        error?: string;
      };
      const nextView = normalizeDependencyView(updatePayload.data);
      if (!updateRes.ok || !updatePayload.success || !nextView) {
        alert(updatePayload.error ?? 'Failed to reverse edge');
        return;
      }

      setCurrentView(nextView);
      setSelectedEdgeId(null);
    } finally {
      setIsUpdatingEdge(false);
    }
  }, [currentView]);

  // Rebuild ReactFlow graph whenever the view or task list changes
  useEffect(() => {
    if (!currentView) {
      setNodes([]);
      setEdges([]);
      setSelectedEdgeId(null);
      return;
    }
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const layoutConfig = DISPLAY_MODE_CONFIG[displayMode];
    const rawNodes: TaskFlowNode[] = currentView.nodes
      .filter((n) => taskMap.has(n.taskId))
      .map((n) => ({
        id: n.taskId,
        type: 'taskNode' as const,
        position: { x: 0, y: 0 },
        data: {
          task: taskMap.get(n.taskId) as TaskItem,
          tagMap,
          isDone: (taskMap.get(n.taskId) as TaskItem).status === 'done',
          isReady: currentView.edges
            .filter((edge) => edge.toTaskId === n.taskId)
            .every((edge) => taskMap.get(edge.fromTaskId)?.status === 'done'),
          displayMode,
          onAddNext: handleAddNext,
          onRemove: handleRemove,
          onStatusChange: handleTaskStatusChange,
          isStatusUpdating: updatingTaskId === n.taskId,
        } as unknown as TaskNodeData,
      }));
    let isCancelled = false;

    void (async () => {
      const layouted = rawNodes.length > 0
        ? await computeAutoLayout(rawNodes, currentView.edges, taskMap, selectedEdgeId, layoutConfig)
        : { nodes: rawNodes, edges: [] as TaskFlowEdge[] };

      if (isCancelled) {
        return;
      }

      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    })();

    return () => {
      isCancelled = true;
    };
  }, [currentView, tasks, tagMap, handleAddNext, handleRemove, handleTaskStatusChange, selectedEdgeId, displayMode, setNodes, setEdges, updatingTaskId]);

  useEffect(() => {
    if (!currentView || !selectedEdgeId) {
      return;
    }
    const stillExists = currentView.edges.some((edge) => edge.id === selectedEdgeId);
    if (!stillExists) {
      setSelectedEdgeId(null);
    }
  }, [currentView, selectedEdgeId]);

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
      const payload = await res.json() as { success: boolean; data: DependencyView | DependencyViewMutationResponse };
      if (payload.success) {
        setCurrentView(normalizeDependencyView(payload.data));
      }
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
        const payload = await res.json() as { success: boolean; data: DependencyView | DependencyViewMutationResponse };
        if (payload.success) {
          setCurrentView(normalizeDependencyView(payload.data));
          if (edge.id === selectedEdgeIdRef.current) {
            setSelectedEdgeId(null);
          }
        }
      }
    })();
  }, []);

  const selectedEdge = useMemo(
    () => currentView?.edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [currentView, selectedEdgeId]
  );
  const isCompact = displayMode === 'compact';

  const selectedEdgeLabel = useMemo(() => {
    if (!selectedEdge) {
      return null;
    }
    const taskMap = new Map(tasks.map((task) => [task.id, task.title]));
    return {
      from: taskMap.get(selectedEdge.fromTaskId) ?? selectedEdge.fromTaskId,
      to: taskMap.get(selectedEdge.toTaskId) ?? selectedEdge.toTaskId,
    };
  }, [selectedEdge, tasks]);
  const handleEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  const handleExportImage = useCallback(async () => {
    const viewport = reactFlowWrapperRef.current?.querySelector('.react-flow__viewport');
    if (!(viewport instanceof HTMLElement)) {
      alert('Graph canvas is not ready to export yet.');
      return;
    }

    setIsExportingImage(true);
    try {
      reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 0 });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const dataUrl = await toPng(viewport, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        cacheBust: true,
      });

      const downloadLink = document.createElement('a');
      const exportName = (currentView?.name || 'dependency-graph')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'dependency-graph';
      downloadLink.download = `${exportName}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
    } catch (error) {
      console.error('Failed to export graph image:', error);
      alert('Failed to export graph image. Please try again.');
    } finally {
      setIsExportingImage(false);
    }
  }, [currentView?.name]);

  // Create graph
  const handleCreateGraph = useCallback(async () => {
    const pid = projectIdRef.current;
    if (!pid || !newGraphName.trim()) return;
    const res = await fetch(`/api/projects/${pid}/dependency-views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGraphName.trim(), description: newGraphDesc }),
    });
    const payload = await res.json() as { success: boolean; data: DependencyView | DependencyViewMutationResponse };
    if (payload.success) {
      const v = normalizeDependencyView(payload.data);
      if (!v) {
        return;
      }
      const summary: GraphSummary = {
        id: v.id, name: v.name, description: v.description,
        dimension: v.dimension, revision: v.revision, nodeCount: v.nodes.length,
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
      const addPayload = await addRes.json() as {
        success: boolean;
        data: DependencyView | DependencyViewMutationResponse;
        error?: string;
      };
      if (!addPayload.success) { alert(addPayload.error ?? `Failed to add task ${taskId}`); continue; }
      updatedView = normalizeDependencyView(addPayload.data);
      if (addTaskSuccessorId) {
        const edgeRes = await fetch(`/api/projects/${pid}/dependency-views/${gid}/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromTaskId: addTaskSuccessorId, toTaskId: taskId }),
        });
        const edgePayload = await edgeRes.json() as {
          success: boolean;
          data: DependencyView | DependencyViewMutationResponse;
        };
        if (edgePayload.success) {
          updatedView = normalizeDependencyView(edgePayload.data);
        }
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
      <aside
        className={`flex-shrink-0 p-4 flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/45 shadow-sm backdrop-blur-sm transition-all duration-300 ${
          isGraphListCollapsed ? 'w-20' : isCompact ? 'w-48' : 'w-56'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          {!isGraphListCollapsed && (
            <div className="min-w-0">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graphs</h2>
              {projectName && (
                <p className="text-xs text-slate-600 font-semibold truncate mt-0.5">{projectName}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setIsGraphListCollapsed((value) => !value)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-white/80 bg-white text-slate-500 hover:text-slate-800 hover:shadow-sm transition-all"
              title={isGraphListCollapsed ? 'Expand graph list' : 'Collapse graph list'}
            >
              {isGraphListCollapsed ? '→' : '←'}
            </button>
            <button
              type="button"
              onClick={() => setIsCreateGraphOpen(true)}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:scale-95 transition-all shadow-sm shadow-emerald-500/30 text-xl leading-none"
              title="Create new graph"
            >+</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {graphs.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <div className="text-3xl mb-2">📊</div>
              {!isGraphListCollapsed && (
                <>
                  <p className="text-xs font-medium">No graphs yet</p>
                  <p className="text-xs text-slate-300">Click + to create one</p>
                </>
              )}
            </div>
          ) : graphs.map((graph) => (
            <div key={graph.id} className="group relative">
              <button
                type="button"
                onClick={() => setSelectedGraphId(graph.id)}
                className={`w-full rounded-xl transition-all duration-300 ${
                  selectedGraphId === graph.id
                    ? 'bg-white shadow-md ring-1 ring-slate-100 text-slate-900 font-bold'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
                } ${isGraphListCollapsed ? 'px-2 py-3 text-center' : 'text-left px-3 py-2.5 text-sm'}`}
                title={isGraphListCollapsed ? graph.name : undefined}
              >
                {isGraphListCollapsed ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-black uppercase tracking-widest">{graph.name.slice(0, 2)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedGraphId === graph.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {selectedGraphId === graph.id && currentView ? currentView.nodes.length : graph.nodeCount}n
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="truncate pr-5">{graph.name}</div>
                    <div className={`text-[10px] mt-0.5 font-bold px-2 py-0.5 rounded-full inline-block ${selectedGraphId === graph.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {selectedGraphId === graph.id && currentView ? currentView.nodes.length : graph.nodeCount} nodes
                    </div>
                  </>
                )}
              </button>
              {!isGraphListCollapsed && (
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
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Canvas */}
      <div ref={reactFlowWrapperRef} className="flex-1 relative rounded-2xl overflow-hidden shadow-sm border border-white/50 bg-slate-50">
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
               <button
                 type="button"
                 onClick={() => void handleExportImage()}
                 disabled={isExportingImage || nodes.length === 0}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-sky-200 hover:shadow-md text-xs font-bold text-slate-700 transition-all disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-400"
               >
                 <span className="text-sky-500 text-sm leading-none">↓</span>
                 {isExportingImage ? 'Exporting...' : 'Export PNG'}
               </button>
              </div>

             <div className={`absolute top-3 right-3 z-10 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-lg backdrop-blur-sm ${isCompact ? 'w-64' : 'w-72'}`}>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Edge Actions</p>
               {selectedEdge && selectedEdgeLabel ? (
                 <>
                  <p className="mt-2 text-sm font-semibold text-slate-800 leading-snug">
                    {selectedEdgeLabel.from}
                    <span className="mx-2 text-slate-300">→</span>
                    {selectedEdgeLabel.to}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Click another edge to switch selection, or use the actions below.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReverseEdge(selectedEdge.id)}
                      disabled={isUpdatingEdge}
                      className="flex-1 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Reverse
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEdge(selectedEdge.id)}
                      disabled={isUpdatingEdge}
                      className="flex-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-200"
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {isCompact
                    ? 'Select an edge to delete or reverse it.'
                    : 'Click an edge to select it. You can then delete it directly or reverse the dependency direction.'}
                </p>
              )}
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onEdgesDelete={handleEdgesDelete}
              onEdgeClick={handleEdgeClick}
              onPaneClick={() => setSelectedEdgeId(null)}
              onInit={(instance) => {
                reactFlowInstanceRef.current = instance;
              }}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              nodesDraggable={false}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
              deleteKeyCode="Delete"
            >
              <style>{GRAPH_MOTION_STYLES}</style>
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenQuickCreateTask}
                    className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors"
                  >
                    New Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideCompletedInAdd(!hideCompletedInAdd)}
                    className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                  >
                    {hideCompletedInAdd ? 'Show Done' : 'Hide Done'}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {availableTasksForAdd.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <div className="text-3xl mb-2">✨</div>
                  <p className="font-medium text-sm text-slate-500">
                    {tasks.length === 0 ? 'No tasks yet for this project' : 'All available tasks are already in this graph'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Create a new task here and it will appear selected in the list right away.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenQuickCreateTask}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-500/25 transition-colors hover:bg-emerald-600"
                  >
                    <span className="text-base leading-none">+</span>
                    Create New Task
                  </button>
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
                onClick={handleOpenQuickCreateTask}
                className="px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                New Task
              </button>
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

      {isQuickCreateTaskOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">Create Task for This Graph</h2>
              <p className="mt-1 text-sm text-slate-500">Create a new task without leaving Graph view. It will appear in the picker already selected.</p>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label htmlFor="quick-create-task-title" className="mb-1 block text-sm font-semibold text-slate-700">Title *</label>
                <input
                  id="quick-create-task-title"
                  type="text"
                  value={quickCreateTaskForm.title}
                  onChange={(event) => setQuickCreateTaskForm({ ...quickCreateTaskForm, title: event.target.value })}
                  placeholder="Enter task title"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="quick-create-task-description" className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  id="quick-create-task-description"
                  value={quickCreateTaskForm.description}
                  onChange={(event) => setQuickCreateTaskForm({ ...quickCreateTaskForm, description: event.target.value })}
                  rows={3}
                  placeholder="Optional description"
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="quick-create-task-priority" className="mb-1 block text-sm font-semibold text-slate-700">Priority</label>
                <select
                  id="quick-create-task-priority"
                  value={quickCreateTaskForm.priority}
                  onChange={(event) => setQuickCreateTaskForm({ ...quickCreateTaskForm, priority: event.target.value as TaskPriority })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Tags</label>
                <TagSelector
                  tags={tags}
                  selectedTagIds={quickCreateTaskForm.tags}
                  onChange={(nextTagIds) => setQuickCreateTaskForm({ ...quickCreateTaskForm, tags: nextTagIds })}
                />
              </div>
              {quickCreateTaskError && (
                <p className="text-sm font-medium text-rose-600">{quickCreateTaskError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={handleCloseQuickCreateTask}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleQuickCreateTask()}
                disabled={isCreatingTask || !quickCreateTaskForm.title.trim()}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isCreatingTask ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
