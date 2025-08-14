import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/plano-10k-corrida/',
  plugins: [react()],
});


