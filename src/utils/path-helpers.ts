import * as os from 'os';
import * as path from 'path';

/**
 * Get the storage directory for roadmap-skill projects
 * Returns: ~/.roadmap-skill/projects
 */
export function getStorageDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.roadmap-skill', 'projects');
}
