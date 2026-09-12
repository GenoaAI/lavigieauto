import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/**/*.vitest.test.{ts,tsx}",
      "tests/last-inspection-mileage.test.ts",
      "tests/brake-replacement-alert.test.ts",
      "tests/tire-replacement-alert.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
