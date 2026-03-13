import { z } from 'zod';

import { DependencyViewService } from '../services/index.js';
import { storage } from '../storage/index.js';

const dependencyViewService = new DependencyViewService(storage);

function toDependencyViewSummary(view: {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dimension: string | null;
  revision: number;
  nodes: Array<{ taskId: string }>;
  edges: Array<{ id: string }>;
}) {
  return {
    id: view.id,
    projectId: view.projectId,
    name: view.name,
    description: view.description,
    dimension: view.dimension,
    revision: view.revision,
    nodeCount: view.nodes.length,
    edgeCount: view.edges.length,
  };
}

const NullableString = z.string().nullable();

export const createDependencyViewTool = {
  name: 'create_dependency_view',
  description: 'Create a dependency planning view inside a project. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    name: z.string().min(1, 'View name is required'),
    description: z.string().default(''),
    dimension: NullableString.optional(),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    name: string;
    description: string;
    dimension?: string | null;
    verbose?: boolean;
  }) {
    const result = await dependencyViewService.create(input.projectId, input);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: input.verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const listDependencyViewsTool = {
  name: 'list_dependency_views',
  description: 'List dependency planning views in a project. Returns summaries by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: { projectId: string; verbose?: boolean }) {
    const result = await dependencyViewService.list(input.projectId);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: input.verbose ? result.data : result.data.map(toDependencyViewSummary),
    };
  },
};

export const getDependencyViewTool = {
  name: 'get_dependency_view',
  description: 'Get a dependency planning view by project ID and view ID',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: { projectId: string; viewId: string; verbose?: boolean }) {
    const result = await dependencyViewService.get(input.projectId, input.viewId);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: input.verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const updateDependencyViewTool = {
  name: 'update_dependency_view',
  description: 'Update dependency planning view metadata. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    dimension: NullableString.optional(),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    viewId: string;
    name?: string;
    description?: string;
    dimension?: string | null;
    verbose?: boolean;
  }) {
    const { projectId, viewId, verbose, ...updateData } = input;
    const result = await dependencyViewService.update(projectId, viewId, updateData);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const deleteDependencyViewTool = {
  name: 'delete_dependency_view',
  description: 'Delete a dependency planning view by project ID and view ID',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
  }),
  async execute(input: { projectId: string; viewId: string }) {
    const result = await dependencyViewService.delete(input.projectId, input.viewId);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: { deleted: true },
    };
  },
};

export const addTaskToDependencyViewTool = {
  name: 'add_task_to_dependency_view',
  description: 'Add an existing task into a dependency planning view. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    taskId: z.string().min(1, 'Task ID is required'),
    x: z.number().optional(),
    y: z.number().optional(),
    collapsed: z.boolean().optional(),
    note: NullableString.optional(),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    viewId: string;
    taskId: string;
    x?: number;
    y?: number;
    collapsed?: boolean;
    note?: string | null;
    verbose?: boolean;
  }) {
    const { projectId, viewId, verbose, ...nodeData } = input;
    const result = await dependencyViewService.addNode(projectId, viewId, nodeData);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const updateDependencyViewNodeTool = {
  name: 'update_dependency_view_node',
  description: 'Update a task node layout or note inside a dependency planning view. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    taskId: z.string().min(1, 'Task ID is required'),
    x: z.number().optional(),
    y: z.number().optional(),
    collapsed: z.boolean().optional(),
    note: NullableString.optional(),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    viewId: string;
    taskId: string;
    x?: number;
    y?: number;
    collapsed?: boolean;
    note?: string | null;
    verbose?: boolean;
  }) {
    const { projectId, viewId, taskId, verbose, ...nodeData } = input;
    const result = await dependencyViewService.updateNode(projectId, viewId, taskId, nodeData);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const batchUpdateDependencyViewNodesTool = {
  name: 'batch_update_dependency_view_nodes',
  description: 'Update multiple task node layouts or notes inside a dependency planning view. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    nodes: z.array(z.object({
      taskId: z.string().min(1, 'Task ID is required'),
      x: z.number().optional(),
      y: z.number().optional(),
      collapsed: z.boolean().optional(),
      note: NullableString.optional(),
    })).min(1, 'At least one node update is required'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    viewId: string;
    nodes: Array<{
      taskId: string;
      x?: number;
      y?: number;
      collapsed?: boolean;
      note?: string | null;
    }>;
    verbose?: boolean;
  }) {
    const { projectId, viewId, verbose, ...nodeData } = input;
    const result = await dependencyViewService.batchUpdateNodes(projectId, viewId, nodeData);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const removeTaskFromDependencyViewTool = {
  name: 'remove_task_from_dependency_view',
  description: 'Remove a task node from a dependency planning view. Connected edges are removed too. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    taskId: z.string().min(1, 'Task ID is required'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: { projectId: string; viewId: string; taskId: string; verbose?: boolean }) {
    const result = await dependencyViewService.removeNode(input.projectId, input.viewId, input.taskId);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: input.verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const addDependencyViewEdgeTool = {
  name: 'add_dependency_view_edge',
  description: 'Create a dependency edge between two tasks already present in a dependency planning view. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    fromTaskId: z.string().min(1, 'Source task ID is required'),
    toTaskId: z.string().min(1, 'Target task ID is required'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    viewId: string;
    fromTaskId: string;
    toTaskId: string;
    verbose?: boolean;
  }) {
    const { projectId, viewId, verbose, ...edgeData } = input;
    const result = await dependencyViewService.addEdge(projectId, viewId, edgeData);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const removeDependencyViewEdgeTool = {
  name: 'remove_dependency_view_edge',
  description: 'Remove a dependency edge from a dependency planning view. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    edgeId: z.string().min(1, 'Edge ID is required'),
    verbose: z.boolean().optional(),
  }),
  async execute(input: { projectId: string; viewId: string; edgeId: string; verbose?: boolean }) {
    const result = await dependencyViewService.removeEdge(input.projectId, input.viewId, input.edgeId);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: input.verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const updateDependencyViewEdgeTool = {
  name: 'update_dependency_view_edge',
  description: 'Update the direction of a dependency edge inside a dependency planning view. Returns summary by default; set verbose=true for full data.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
    edgeId: z.string().min(1, 'Edge ID is required'),
    fromTaskId: z.string().min(1).optional(),
    toTaskId: z.string().min(1).optional(),
    verbose: z.boolean().optional(),
  }),
  async execute(input: {
    projectId: string;
    viewId: string;
    edgeId: string;
    fromTaskId?: string;
    toTaskId?: string;
    verbose?: boolean;
  }) {
    const { projectId, viewId, edgeId, verbose, ...edgeData } = input;
    const result = await dependencyViewService.updateEdge(projectId, viewId, edgeId, edgeData);
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: verbose ? result.data : toDependencyViewSummary(result.data),
    };
  },
};

export const analyzeDependencyViewTool = {
  name: 'analyze_dependency_view',
  description: 'Analyze a dependency planning view and return topological layers, ready tasks, blocked tasks, roots, leaves, and isolated tasks.',
  inputSchema: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    viewId: z.string().min(1, 'View ID is required'),
  }),
  async execute(input: { projectId: string; viewId: string }) {
    return await dependencyViewService.analyze(input.projectId, input.viewId);
  },
};
