import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    {
      name: "drop-bundled-onnx-wasm",
      generateBundle(_options, bundle) {
        for (const fileName of Object.keys(bundle)) {
          if (fileName.endsWith(".wasm")) delete bundle[fileName];
        }
      },
    },
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
