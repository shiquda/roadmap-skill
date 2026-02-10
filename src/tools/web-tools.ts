import { createServer } from '../web/server.js';
import open from 'open';
import type { Server } from 'http';

let activeServer: Server | null = null;

async function openBrowser(url: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    console.error('Failed to open browser:', error);
  }
}

export const openWebInterfaceTool = {
  name: 'open_web_interface',
  description: 'Open web visualization interface',
  parameters: {
    type: 'object',
    properties: {
      port: {
        type: 'number',
        description: 'Port to run the web interface on (default: 7860)',
      },
    },
  },
  async execute(args: { port?: number }) {
    if (activeServer) {
      return { 
        message: 'Web interface is already running',
        url: `http://localhost:${(activeServer.address() as any).port}`
      };
    }

    const port = args.port || 7860;
    activeServer = createServer(port);
    const url = `http://localhost:${port}`;

    void openBrowser(url);

    return {
      message: 'Web interface started successfully and opened in browser',
      url: url
    };
  }
};

export const closeWebInterfaceTool = {
  name: 'close_web_interface',
  description: 'Close web visualization interface',
  parameters: {
    type: 'object',
    properties: {},
  },
  async execute() {
    if (!activeServer) {
      return { message: 'Web interface is not running' };
    }

    return new Promise((resolve) => {
      activeServer!.close(() => {
        activeServer = null;
        resolve({ message: 'Web interface stopped' });
      });
    });
  }
};
