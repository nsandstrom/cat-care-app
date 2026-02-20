import type { ChecklistResponse, TasksResponse, Task } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const TOKEN = process.env.NEXT_PUBLIC_HOUSEHOLD_TOKEN ?? '';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Household-Token': TOKEN,
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
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
