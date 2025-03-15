import { defineConfig } from "vite";

export default defineConfig({
    base: './', 
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
            }
        },
        // Disable chunk splitting to simplify structure
        chunkSizeWarningLimit: 2000,
    },
    server: {
        port: 3000,
        open: true,
    }
})