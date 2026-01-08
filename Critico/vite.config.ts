import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    solid(), // Das ist das Plugin für reines Solid.js
    tailwindcss(),
    solidPlugin(),
  ],
});