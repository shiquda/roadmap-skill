/**
 * LocalStorage utility with fallback to memory storage
 * Handles cases where localStorage is unavailable (private mode, quota exceeded, etc.)
 */

const STORAGE_KEYS = {
  SELECTED_PROJECT_ID: 'roadmap_skill:selected_project_id',
  VIEW_PREFERENCES: 'roadmap_skill:view_preferences',
} as const;

// Memory fallback storage when localStorage is unavailable
const memoryStorage = new Map<string, string>();

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const localStorageAvailable = isLocalStorageAvailable();

/**
 * Get item from storage (localStorage or memory fallback)
 * @param key - Storage key
 * @returns Parsed value or null if not found
 */
export function getItem<T>(key: string): T | null {
  try {
    let item: string | null | undefined;
    
    if (localStorageAvailable) {
      item = localStorage.getItem(key);
    } else {
      item = memoryStorage.get(key);
    }
    
    if (item === null || item === undefined) {
      return null;
    }
    
    return JSON.parse(item) as T;
  } catch {
    // Return null on parse error or storage error
    return null;
  }
}

/**
 * Set item in storage (localStorage or memory fallback)
 * @param key - Storage key
 * @param value - Value to store (will be JSON serialized)
 */
export function setItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    
    if (localStorageAvailable) {
      localStorage.setItem(key, serialized);
    } else {
      memoryStorage.set(key, serialized);
    }
  } catch {
    // Silently fail - storage is not critical functionality
    // Could be quota exceeded or storage disabled
  }
}

/**
 * Remove item from storage
 * @param key - Storage key to remove
 */
export function removeItem(key: string): void {
  try {
    if (localStorageAvailable) {
      localStorage.removeItem(key);
    } else {
      memoryStorage.delete(key);
    }
  } catch {
    // Silently fail
  }
}

export { STORAGE_KEYS };
