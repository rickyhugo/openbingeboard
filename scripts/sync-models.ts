import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  EMBEDDING_MODEL,
  MODEL_ORIGIN,
  ONNX_RUNTIME_VERSION,
} from "../app/lib/ai/embedding";

const BUCKET = "openbingeboard-models";
const STAGING = "db/generated/models";
const MODEL_BASE = EMBEDDING_MODEL.id + "/resolve/" + EMBEDDING_MODEL.revision;
const RUNTIME_BASE = "onnxruntime/" + ONNX_RUNTIME_VERSION;

interface ModelFile {
  key: string;
  url: string;
  contentType: string;
}

const FILES: ModelFile[] = [
  {
    key: MODEL_BASE + "/config.json",
    url: "https://huggingface.co/" + MODEL_BASE + "/config.json",
    contentType: "application/json",
  },
  {
    key: MODEL_BASE + "/tokenizer.json",
    url: "https://huggingface.co/" + MODEL_BASE + "/tokenizer.json",
    contentType: "application/json",
  },
  {
    key: MODEL_BASE + "/tokenizer_config.json",
    url: "https://huggingface.co/" + MODEL_BASE + "/tokenizer_config.json",
    contentType: "application/json",
  },
  {
    key: MODEL_BASE + "/special_tokens_map.json",
    url: "https://huggingface.co/" + MODEL_BASE + "/special_tokens_map.json",
    contentType: "application/json",
  },
  {
    key: MODEL_BASE + "/onnx/model_quantized.onnx",
    url: "https://huggingface.co/" + MODEL_BASE + "/onnx/model_quantized.onnx",
    contentType: "application/octet-stream",
  },
  {
    key: RUNTIME_BASE + "/ort-wasm-simd-threaded.asyncify.wasm",
    url:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@" +
      ONNX_RUNTIME_VERSION +
      "/dist/ort-wasm-simd-threaded.asyncify.wasm",
    contentType: "application/wasm",
  },
  {
    key: RUNTIME_BASE + "/ort-wasm-simd-threaded.asyncify.mjs",
    url:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@" +
      ONNX_RUNTIME_VERSION +
      "/dist/ort-wasm-simd-threaded.asyncify.mjs",
    contentType: "text/javascript",
  },
];

const checkOnly = process.argv.includes("--check");
const force = process.argv.includes("--force");

function localPath(key: string) {
  return join(STAGING, key);
}

async function remoteSize(key: string): Promise<number | null> {
  // The custom domain can briefly serve a stale 404 right after an upload.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    // R2 does not expose content-length to Node's fetch on HEAD, so ask for
    // one byte and read the total from content-range.
    const response = await fetch(MODEL_ORIGIN + key, {
      headers: { Range: "bytes=0-0" },
    });
    if (response.ok) {
      const range = response.headers.get("content-range");
      const value = Number(
        range ? range.split("/")[1] : response.headers.get("content-length"),
      );
      await response.body?.cancel();
      if (Number.isFinite(value)) return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

async function download(file: ModelFile): Promise<string> {
  const path = localPath(file.key);
  if (existsSync(path)) return path;

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(
      "Download failed for " + file.url + " (" + response.status + ")",
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return path;
}

function upload(file: ModelFile, path: string) {
  execFileSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "r2",
      "object",
      "put",
      BUCKET + "/" + file.key,
      "--file=" + path,
      "--content-type=" + file.contentType,
      "--cache-control=public, max-age=31536000, immutable",
      "--remote",
    ],
    { stdio: "inherit" },
  );
}

async function main() {
  let uploaded = 0;
  let skipped = 0;

  for (const file of FILES) {
    const path = await download(file);
    const size = statSync(path).size;
    const existing = await remoteSize(file.key);

    if (!force && existing === size) {
      skipped += 1;
      console.log("ok      " + file.key + " (" + size + " bytes)");
      continue;
    }

    if (checkOnly) {
      throw new Error(
        "Mismatch for " +
          file.key +
          ": local " +
          size +
          ", remote " +
          String(existing),
      );
    }

    upload(file, path);
    const after = await remoteSize(file.key);
    if (after !== size) {
      throw new Error(
        "Upload verification failed for " +
          file.key +
          ": expected " +
          size +
          ", got " +
          String(after),
      );
    }
    uploaded += 1;
    console.log("upload  " + file.key + " (" + size + " bytes)");
  }

  console.log(
    "done: " + uploaded + " uploaded, " + skipped + " already current",
  );
}

await main();
