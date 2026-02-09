// Minimal toast event bus (publish/subscribe) with no external deps.
// Screens can subscribe to toast events and render <Toast /> accordingly.

export type ToastLevel = "info" | "success" | "error";

export type ToastEvent = {
  id: string;
  message: string;
  level: ToastLevel;
};

type Listener = (event: ToastEvent | null) => void;

let currentListener: Listener | null = null;

function makeId(): string {
  return `toast_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

export function subscribeToast(listener: Listener): () => void {
  currentListener = listener;
  return () => {
    if (currentListener === listener) {
      currentListener = null;
    }
  };
}

export function showToast(message: string, level: ToastLevel = "info"): void {
  if (!currentListener) return;
  currentListener({
    id: makeId(),
    message,
    level,
  });
}

