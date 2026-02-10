import { createServer } from '../web/server.js';
import type { Server } from 'http';

let activeServer: Server | null = null;

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
    
    return {
      message: 'Web interface started successfully',
      url: `http://localhost:${port}`
    };
  }
};

export const closeWebInterfaceTool = {
  name: 'close_web_interface',
  description: 'Close web visualization interface',
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
