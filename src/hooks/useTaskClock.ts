import { useSyncExternalStore } from 'react';

let now = new Date();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
function refresh() { now = new Date(); listeners.forEach(listener => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    timer = setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    }
  };
}
// Un solo reloj para tareas, agenda y alertas; se detiene sin consumidores.
export function useTaskClock(): Date {
  return useSyncExternalStore(subscribe, () => now);
}
