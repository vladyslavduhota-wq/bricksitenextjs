import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Lives in tests/ to keep the project root clean; paths resolve from the project root.
const root = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  root,
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/db/global-setup.ts"],
    // DB tests share one database and reset it per file, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
