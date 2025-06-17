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
                report: "./report.html",
                contentScript: "./src/contentScript.ts",
                background: "./src/background.ts",
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === "contentScript") {
                        return "contentScript.js";
                    } else if (chunkInfo.name === "background") {
                        return "background.js";
                    }
                    return "[name]-[hash].js";
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
    define: {
        __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL),
    },
});
