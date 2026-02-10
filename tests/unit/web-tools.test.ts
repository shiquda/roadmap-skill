import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'net';

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

import open from 'open';
import { closeWebInterfaceTool, openWebInterfaceTool } from '../../src/tools/web-tools.js';

async function getAvailablePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address !== 'object') {
        server.close(() => reject(new Error('Failed to get available port')));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

describe('web tools', () => {
  afterEach(async () => {
    await closeWebInterfaceTool.execute();
    vi.clearAllMocks();
  });

  it('should open browser again when server is already running on same port', async () => {
    const port = await getAvailablePort();

    const first = await openWebInterfaceTool.execute({ port });
    const second = await openWebInterfaceTool.execute({ port });

    expect(first.url).toBe(`http://localhost:${port}`);
    expect(second.url).toBe(`http://localhost:${port}`);
    expect(second.message).toBe('Web interface is already running');
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('should fail when requesting a different port while server is running', async () => {
    const portA = await getAvailablePort();
    const portB = await getAvailablePort();

    await openWebInterfaceTool.execute({ port: portA });

    await expect(openWebInterfaceTool.execute({ port: portB })).rejects.toThrow(
      `Web interface is already running on port ${portA}`,
    );
  });

  it('should close running server and allow opening again', async () => {
    const port = await getAvailablePort();

    await openWebInterfaceTool.execute({ port });
    const closeResult = await closeWebInterfaceTool.execute();
    const reopen = await openWebInterfaceTool.execute({ port });

    expect(closeResult).toEqual({ message: 'Web interface stopped' });
    expect(reopen.url).toBe(`http://localhost:${port}`);
  });

  it('should fail with clear message when requested port is occupied', async () => {
    const occupiedPort = await getAvailablePort();
    const holder = createServer();

    await new Promise<void>((resolve, reject) => {
      holder.once('error', reject);
      holder.listen(occupiedPort, '127.0.0.1', () => resolve());
    });

    try {
      await expect(openWebInterfaceTool.execute({ port: occupiedPort })).rejects.toThrow(
        `Failed to start web interface: Port ${occupiedPort} is already in use`,
      );
    } finally {
      await new Promise<void>((resolve, reject) => {
        holder.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });
});
