import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH mengatur sub-path saat deploy. Contoh GitHub Pages:
//   BASE_PATH=/nama-repo/ npm run build
// Default "./" (relatif) sehingga build bisa dibuka dari sub-folder mana pun.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
