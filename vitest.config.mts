import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// tsconfig.json の paths と同じ "@/" エイリアスをテスト実行時にも解決する。
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
