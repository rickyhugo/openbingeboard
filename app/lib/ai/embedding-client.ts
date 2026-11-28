type Pending = {
  resolve: (message: WorkerReply) => void;
  reject: (error: Error) => void;
};

type WorkerReply =
  | { id: number; type: "ready" }
  | { id: number; type: "vector"; vector: number[] }
  | { id: number; type: "error"; error: string };

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

  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const message = event.data;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);

    if (message.type === "error") {
      request.reject(new Error(message.error));
      return;
    }
    request.resolve(message);
  };

  worker.onerror = () => rejectAll(new Error("Embedding worker failed."));
  return worker;
}

function send(
  message: { type: "warmup" } | { type: "embed"; text: string },
): Promise<WorkerReply> {
  const active = ensureWorker();
  const id = nextId++;

  return new Promise<WorkerReply>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    active.postMessage({ id, ...message });
  });
}

export async function warmupEmbeddingModel(): Promise<void> {
  const reply = await send({ type: "warmup" });
  if (reply.type !== "ready") throw new Error("Model did not start.");
}

export async function embedQuery(text: string): Promise<number[]> {
  const reply = await send({ type: "embed", text });
  if (reply.type !== "vector")
    throw new Error("Model did not return a vector.");
  return reply.vector;
}
