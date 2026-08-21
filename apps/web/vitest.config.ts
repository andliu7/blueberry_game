import { defineConfig } from "vitest/config";

/**
 * Tests here cover the pure layout and scene layers, which is where the
 * geometry decisions live. The React components are judged by the Phase 4
 * human gate and measured by the frame scripts; unit-testing JSX output would
 * assert the implementation, not the design.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
