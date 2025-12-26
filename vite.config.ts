import { defineConfig } from "vite";

import path from "node:path";

export default defineConfig({
    build: {
        lib: {
            entry: "src/workers/ServiceWorker.ts",
            fileName: "sw",
            formats: ["es"],
        },
        rollupOptions: {
            external: [/^node:/],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
