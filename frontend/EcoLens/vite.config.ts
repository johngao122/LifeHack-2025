import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        minify: "esbuild",
        rollupOptions: {
            input: {
                main: "./index.html",
                contentScript: "./src/contentScript.ts",
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    return chunkInfo.name === "contentScript"
                        ? "contentScript.js"
                        : "[name]-[hash].js";
                },
                // Less aggressive minification to avoid conflicts
                compact: false,
            },
        },
    },
    esbuild: {
        // Keep class and function names to avoid variable conflicts
        keepNames: true,
    },
});
