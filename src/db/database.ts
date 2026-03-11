export interface DatabaseAdapter {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (unknown | unknown[])[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

declare global {
  interface Window {
    electronAPI?: {
      db: {
        exec: (sql: string) => Promise<void>;
        run: (sql: string, params?: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;
        getFirst: (sql: string, params?: unknown[]) => Promise<unknown>;
        getAll: (sql: string, params?: unknown[]) => Promise<unknown[]>;
      };
    };
  }
}

let dbPromise: Promise<DatabaseAdapter> | null = null;

function normalizeParams(params: (unknown | unknown[])[]): unknown[] {
  if (params.length === 0) return [];
  const first = params[0];
  if (Array.isArray(first) && params.length === 1) return first;
  return params as unknown[];
}

async function initDb(): Promise<DatabaseAdapter> {
  const api = window.electronAPI?.db;
  if (!api) throw new Error('Electron API not available');
  return {
    execAsync: (sql: string) => api.exec(sql),
    runAsync: async (sql: string, ...params: (unknown | unknown[])[]) => {
      const normalized = normalizeParams(params);
      return api.run(sql, normalized);
    },
    getFirstAsync: <T>(sql: string, params?: unknown[]) =>
      api.getFirst(sql, params ?? []) as Promise<T | null>,
    getAllAsync: <T>(sql: string, params?: unknown[]) =>
      api.getAll(sql, params ?? []) as Promise<T[]>,
  };
}

export function getDb(): Promise<DatabaseAdapter> {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}
