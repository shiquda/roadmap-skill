import { createServer } from '../web/server.js';
import open from 'open';
import type { Server } from 'http';

let activeServer: Server | null = null;
let activePort: number | null = null;

function getServerPort(server: Server): number | null {
  const address = server.address();

  if (address && typeof address === 'object' && 'port' in address) {
    return typeof address.port === 'number' ? address.port : null;
  }

  return null;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });

    const forceCloseServer = server as {
      closeAllConnections?: () => void;
      closeIdleConnections?: () => void;
    };
    forceCloseServer.closeIdleConnections?.();
    forceCloseServer.closeAllConnections?.();
  });
}

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
    const requestedPort = args.port || 7860;

    if (activeServer) {
      const runningPort = getServerPort(activeServer) ?? activePort;

      if (runningPort !== requestedPort) {
        throw new Error(`Web interface is already running on port ${runningPort ?? 'unknown'}. Please close it before opening a different port.`);
      }

      const url = `http://localhost:${runningPort ?? requestedPort}`;
      await openBrowser(url);

      return { 
        message: 'Web interface is already running',
        url,
      };
    }

    const url = `http://localhost:${requestedPort}`;

    try {
      activeServer = await createServer(requestedPort);
      activePort = requestedPort;
      await openBrowser(url);

      return {
        message: 'Web interface started successfully and opened in browser',
        url,
      };
    } catch (error) {
      activeServer = null;
      activePort = null;

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start web interface: ${errorMessage}`);
    }
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

    try {
      await closeServer(activeServer);
      activeServer = null;
      activePort = null;
      return { message: 'Web interface stopped' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to stop web interface: ${errorMessage}`);
    }
  }
};
