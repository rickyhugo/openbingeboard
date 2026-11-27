import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import { EMBEDDING_MODEL, queryEmbeddingText } from "~/lib/ai/embedding";

// Keep the large ONNX runtime out of the Worker asset bundle. The version is
// pinned to the onnxruntime-web dependency that transformers.js resolves.
env.backends.onnx.wasm!.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/";

interface AskWorkerRequest {
  id: number;
  text: string;
}

interface AskWorkerScope {
  onmessage: ((event: MessageEvent<AskWorkerRequest>) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as AskWorkerScope;
let extractor: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  extractor ??= pipeline("feature-extraction", EMBEDDING_MODEL.id, {
    dtype: EMBEDDING_MODEL.dtype,
    device: "wasm",
  });
  return extractor;
}

scope.onmessage = async (event) => {
  const { id, text } = event.data;

  try {
    const model = await getExtractor();
    const output = await model(queryEmbeddingText(text), {
      pooling: "mean",
      normalize: true,
    });
    scope.postMessage({
      id,
      vector: Array.from(output.data as Float32Array),
    });
  } catch (error) {
    scope.postMessage({
      id,
      error: error instanceof Error ? error.message : "Embedding failed.",
    });
  }
};
