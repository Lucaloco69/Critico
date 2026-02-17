import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    integrations: [solid()],
    adapter: node({
        mode: 'standalone',
    }),
    vite: {
        plugins: [tailwindcss()],
        build: {
            minify: 'esbuild',
            chunkSizeWarningLimit: 1000,
            esbuild: {
                drop: ['console', 'debugger'],
            },
        },
    },
    output: 'server',
});
