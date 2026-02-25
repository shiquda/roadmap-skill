import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'net';

vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

import { closeWebInterfaceTool, openWebInterfaceTool } from '../../src/tools/web-tools.js';

async function getAvailablePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      if (!addr || typeof addr !== 'object') {
        s.close(() => reject(new Error('no addr')));
        return;
      }
      const port = addr.port;
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

describe('MCP stdio stdout purity', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(
      (_chunk: unknown, _encodingOrCb?: unknown, _cb?: unknown): boolean => {
        throw new Error(
          `process.stdout.write called during MCP tool execution — stdout must carry only JSON-RPC frames. Got: ${String(_chunk).slice(0, 200)}`,
        );
      },
    );
  });

  afterEach(async () => {
    stdoutSpy.mockRestore();
    await closeWebInterfaceTool.execute();
    vi.clearAllMocks();
  });

  it('open_web_interface does not write to stdout', async () => {
    const port = await getAvailablePort();
    const result = await openWebInterfaceTool.execute({ port });
    expect(result.url).toBe(`http://localhost:${port}`);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('close_web_interface does not write to stdout', async () => {
    const port = await getAvailablePort();
    await openWebInterfaceTool.execute({ port });

    stdoutSpy.mockClear();

    const result = await closeWebInterfaceTool.execute();
    expect(result).toEqual({ message: 'Web interface stopped' });
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('open_web_interface on already-running port does not write to stdout', async () => {
    const port = await getAvailablePort();
    await openWebInterfaceTool.execute({ port });

    stdoutSpy.mockClear();

    const second = await openWebInterfaceTool.execute({ port });
    expect(second.message).toBe('Web interface is already running');
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('open_web_interface failure does not write to stdout', async () => {
    const holder = createServer();
    const occupiedPort = await getAvailablePort();
    await new Promise<void>((resolve, reject) => {
      holder.once('error', reject);
      holder.listen(occupiedPort, '127.0.0.1', () => resolve());
    });

    try {
      await expect(openWebInterfaceTool.execute({ port: occupiedPort })).rejects.toThrow(
        `Failed to start web interface: Port ${occupiedPort} is already in use`,
      );
      expect(stdoutSpy).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) =>
        holder.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
