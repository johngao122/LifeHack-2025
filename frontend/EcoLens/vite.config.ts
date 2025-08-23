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
                uiInject: "./src/injected/ui/inject.tsx",
            },
            output: [
                // HTML entries (main popup and report page)
                {
                    entryFileNames: (chunkInfo) => {
                        if (chunkInfo.name === "contentScript") {
                            return "contentScript.js";
                        } else if (chunkInfo.name === "background") {
                            return "background.js";
                        } else if (chunkInfo.name === "uiInject") {
                            return "ui-inject.js";
                        }
                        return "[name]-[hash].js";
                    },
                    // Less aggressive minification to avoid conflicts
                    compact: false,
                    // Ensure ES modules format for Chrome extension scripts
                    format: "es",
                },
            ],
            external: (id) => {
                // Don't bundle Chrome extension APIs
                return id.startsWith("chrome-extension://") || id === "chrome";
            },
        },
    },
    esbuild: {
        // Keep class and function names to avoid variable conflicts
        keepNames: true,
        // Ensure ES module target
        target: "es2020",
        format: "esm",
    },
    define: {
        __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL),
    },
});
