type Pending = {
  resolve: (vector: number[]) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function rejectAll(error: Error) {
  for (const request of pending.values()) request.reject(error);
  pending.clear();
  worker = null;
}

function ensureWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(
    new URL("../../workers/embedding.worker.ts", import.meta.url),
    { type: "module" },
  );

  worker.onmessage = (
    event: MessageEvent<{ id: number; vector?: number[]; error?: string }>,
  ) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);

    if (event.data.error) {
      request.reject(new Error(event.data.error));
      return;
    }
    if (event.data.vector) request.resolve(event.data.vector);
  };

  worker.onerror = () => rejectAll(new Error("Embedding worker failed."));
  return worker;
}

export function embedQuery(text: string): Promise<number[]> {
  const active = ensureWorker();
  const id = nextId++;

  return new Promise<number[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    active.postMessage({ id, text });
  });
}
