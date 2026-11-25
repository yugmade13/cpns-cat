import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH mengatur sub-path saat deploy. Contoh GitHub Pages:
//   BASE_PATH=/nama-repo/ npm run build
// Default "./" (relatif) sehingga build bisa dibuka dari sub-folder mana pun.
const base = process.env.BASE_PATH ?? './';

// Alamat lengkap situs, dipakai untuk Open Graph (pratinjau tautan). Sebagian besar platform
// (WhatsApp, Facebook, LinkedIn, X) hanya membaca og:image dengan URL absolut. Urutan sumber:
//   1. SITE_URL (isi manual, mis. domain sendiri):  SITE_URL=https://domainmu.com npm run build
//   2. Di Vercel otomatis: VERCEL_PROJECT_PRODUCTION_URL (domain produksi), lalu VERCEL_URL (alamat deployment).
//      Keduanya disediakan Vercel saat build tanpa protokol, mis. "berhasil-skd-cpns.vercel.app".
export function resolveSiteUrl(env: Record<string, string | undefined>): string | undefined {
  const manual = env.SITE_URL?.trim();
  if (manual) return manual;
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim();
  return vercel ? `https://${vercel.replace(/^https?:\/\//i, '')}` : undefined;
}
const siteUrl = resolveSiteUrl(process.env);

/** Mengisi %OG_IMAGE% dan <!--OG_URL--> di index.html berdasarkan SITE_URL. */
function openGraph(rawUrl: string | undefined): Plugin {
  const url = rawUrl?.trim().replace(/\/+$/, '');
  if (url && !/^https?:\/\//i.test(url)) {
    throw new Error(`SITE_URL harus diawali http:// atau https:// (ditemukan: "${rawUrl}").`);
  }
  return {
    name: 'open-graph-url',
    configResolved(config) {
      if (!url && config.command === 'build') {
        config.logger.warn(
          '\n[open-graph] SITE_URL belum diisi: og:image memakai alamat relatif, sehingga pratinjau tautan ' +
            'di WhatsApp/Facebook/X mungkin tidak muncul. Contoh: SITE_URL=https://domainmu.com npm run build\n',
        );
      } else if (url && config.command === 'build') {
        config.logger.info(`[open-graph] og:image → ${url}/og-image.png`);
      }
    },
    transformIndexHtml(html) {
      const image = url ? `${url}/og-image.png` : 'og-image.png';
      return html
        .replaceAll('%OG_IMAGE%', image)
        .replace('<!--OG_URL-->', url ? `<meta property="og:url" content="${url}/" />` : '');
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), openGraph(siteUrl)],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
