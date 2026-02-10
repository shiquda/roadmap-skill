import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
	ListPromptsRequestSchema,
	GetPromptRequestSchema,
	type CallToolRequest,
	type ListToolsRequest,
	type ListResourcesRequest,
	type ReadResourceRequest,
	type ListPromptsRequest,
	type GetPromptRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { zodToJsonSchema } from "zod-to-json-schema";

import {
	createProjectTool,
	listProjectsTool,
	getProjectTool,
	updateProjectTool,
	deleteProjectTool,
	createTaskTool,
	listTasksTool,
	getTaskTool,
	updateTaskTool,
	deleteTaskTool,
	batchUpdateTasksTool,
	createTagTool,
	listTagsTool,
	updateTagTool,
	deleteTagTool,
	getTasksByTagTool,
	openWebInterfaceTool,
	closeWebInterfaceTool,
} from "./tools/index.js";
import { getAllResources, handleResourceRequest } from "./resources/index.js";
import { getAllPrompts, getPromptByName } from "./prompts/index.js";

const allTools = [
	createProjectTool,
	listProjectsTool,
	getProjectTool,
	updateProjectTool,
	deleteProjectTool,
	createTaskTool,
	listTasksTool,
	getTaskTool,
	updateTaskTool,
	deleteTaskTool,
	batchUpdateTasksTool,
	createTagTool,
	listTagsTool,
	updateTagTool,
	deleteTagTool,
	getTasksByTagTool,
	openWebInterfaceTool,
	closeWebInterfaceTool,
];

const toolMap = new Map(allTools.map((tool) => [tool.name, tool]));

export function createServer(): Server {
	const server = new Server(
		{
			name: "roadmap-skill",
			version: "0.1.4",
		},
		{
			capabilities: {
				tools: {},
				resources: {},
				prompts: {},
			},
		},
	);

	server.setRequestHandler(
		ListToolsRequestSchema,
		async (_request: ListToolsRequest) => {
			return {
				tools: allTools.map((tool) => {
					const rawSchema =
						(tool as any).parameters || (tool as any).inputSchema;
					let inputSchema: Record<string, unknown>;

					if (!rawSchema) {
						inputSchema = { type: "object" };
					} else if (rawSchema.type === "object") {
						inputSchema = rawSchema;
					} else {
						inputSchema = zodToJsonSchema(rawSchema, {
							name: tool.name,
							$refStrategy: "none",
						}).definitions?.[tool.name] || { type: "object" };
					}

					return {
						name: tool.name,
						description: tool.description,
						inputSchema,
					};
				}),
			};
		},
	);

	server.setRequestHandler(
		CallToolRequestSchema,
		async (request: CallToolRequest) => {
			const { name, arguments: args } = request.params;
			const tool = toolMap.get(name);

			if (!tool) {
				throw new Error(`Unknown tool: ${name}`);
			}

			try {
				const result = await tool.execute(args as never);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result, null, 2),
						},
					],
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				throw new Error(`Tool execution failed: ${errorMessage}`);
			}
		},
	);

	server.setRequestHandler(
		ListResourcesRequestSchema,
		async (_request: ListResourcesRequest) => {
			const resources = getAllResources();
			return { resources };
		},
	);

	server.setRequestHandler(
		ReadResourceRequestSchema,
		async (request: ReadResourceRequest) => {
			const uri = request.params.uri;
			const resourceContent = await handleResourceRequest(uri);

			if (!resourceContent) {
				throw new Error(`Resource not found: ${uri}`);
			}

			return {
				contents: [resourceContent],
			};
		},
	);

	server.setRequestHandler(
		ListPromptsRequestSchema,
		async (_request: ListPromptsRequest) => {
			const prompts = getAllPrompts();
			return { prompts };
		},
	);

	server.setRequestHandler(
		GetPromptRequestSchema,
		async (request: GetPromptRequest) => {
			const { name, arguments: args } = request.params;
			const promptResult = getPromptByName(
				name,
				args as Record<string, string> | undefined,
			);

			if (!promptResult) {
				throw new Error(`Prompt not found: ${name}`);
			}

			return promptResult;
		},
	);

	return server;
}

export async function startServer(): Promise<void> {
	const server = createServer();
	const transport = new StdioServerTransport();

	console.error("Roadmap Skill MCP Server starting...");

	try {
		await server.connect(transport);
		console.error("Roadmap Skill MCP Server connected and ready");
	} catch (error) {
		console.error("Failed to start server:", error);
		throw error;
	}
}
