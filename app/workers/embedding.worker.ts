import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import {
  EMBEDDING_MODEL,
  MODEL_ORIGIN,
  ONNX_RUNTIME_VERSION,
  queryEmbeddingText,
} from "~/lib/ai/embedding";

env.allowLocalModels = false;
env.useBrowserCache = true;
env.remoteHost = MODEL_ORIGIN;
env.remotePathTemplate = "{model}/resolve/" + EMBEDDING_MODEL.revision + "/";

// Keep the large ONNX runtime out of the Worker asset bundle. Both the runtime
// and the model are served from R2 under versioned, immutable paths.
env.backends.onnx.wasm!.wasmPaths =
  MODEL_ORIGIN + "onnxruntime/" + ONNX_RUNTIME_VERSION + "/";
env.backends.onnx.wasm!.numThreads = 1;

type WorkerRequest =
  { id: number; type: "warmup" } | { id: number; type: "embed"; text: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as WorkerScope;
let extractor: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  extractor ??= pipeline("feature-extraction", EMBEDDING_MODEL.id, {
    dtype: EMBEDDING_MODEL.dtype,
    device: "wasm",
    progress_callback: (event) => {
      if (event.status !== "progress_total") return;
      scope.postMessage({
        type: "progress",
        loaded: event.loaded,
        total: event.total,
      });
    },
  }).catch((error) => {
    extractor = null;
    throw error;
  });
  return extractor;
}

scope.onmessage = async (event) => {
  const request = event.data;
  const { id } = request;

  try {
    const model = await getExtractor();

    if (request.type === "warmup") {
      scope.postMessage({ id, type: "ready" });
      return;
    }

    const output = await model(queryEmbeddingText(request.text), {
      pooling: "mean",
      normalize: true,
    });
    scope.postMessage({
      id,
      type: "vector",
      vector: Array.from(output.data as Float32Array),
    });
  } catch (error) {
    scope.postMessage({
      id,
      type: "error",
      error: error instanceof Error ? error.message : "Embedding failed.",
    });
  }
};
