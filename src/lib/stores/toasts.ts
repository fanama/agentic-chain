import { writable } from 'svelte/store';

export interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'warn' | 'info';
}

export const toasts = writable<Toast[]>([]);

let counter = 0;

export function showToast(msg: string, type: Toast['type'] = 'info', duration = 3500) {
  const id = ++counter;
  toasts.update((t) => [...t, { id, msg, type }]);
  setTimeout(() => {
    toasts.update((t) => t.filter((x) => x.id !== id));
  }, duration);
}
