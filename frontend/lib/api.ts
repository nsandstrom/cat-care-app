import type { ChecklistResponse, TasksResponse, Task } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'hh_token';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Household-Token': getToken(),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  });

  if (res.status === 401) {
    // Token is invalid or expired — clear it so AuthGate shows the login screen
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  async authenticate(code: string): Promise<void> {
    const res = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error('Invalid code');
    const { token } = await res.json() as { token: string };
    localStorage.setItem(TOKEN_KEY, token);
  },

  getTasks(): Promise<TasksResponse> {
    return request('/tasks');
  },

  getChecklist(date: string): Promise<ChecklistResponse> {
    return request(`/checklist/${date}`);
  },

  markComplete(date: string, taskId: string, completedBy?: string): Promise<unknown> {
    return request(`/checklist/${date}/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(completedBy ? { completedBy } : {}),
    });
  },

  unmarkComplete(date: string, taskId: string): Promise<unknown> {
    return request(`/checklist/${date}/${taskId}`, {
      method: 'DELETE',
    });
  },

  updateTask(taskId: string, updates: Partial<Task>): Promise<{ task: Task }> {
    return request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  getHistory(): Promise<unknown> {
    return request('/history');
  },

  createTask(task: Task): Promise<{ task: Task }> {
    return request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  deleteTask(taskId: string): Promise<{ taskId: string; deleted: boolean }> {
    return request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },
};
