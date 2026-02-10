import * as fs from 'fs/promises';

/**
 * Read and parse a JSON file
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data
 * @throws Error if file cannot be read or parsed
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Write data to a JSON file
 * @param filePath - Path to the JSON file
 * @param data - Data to serialize and write
 * @throws Error if file cannot be written
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed
 * @param dirPath - Path to the directory
 * @throws Error if directory cannot be created
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
    throw error;
  }
}
