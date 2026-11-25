import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from '../vite.config';

describe('alamat situs untuk Open Graph', () => {
  it('SITE_URL diutamakan', () => {
    expect(resolveSiteUrl({ SITE_URL: 'https://domainku.id', VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' })).toBe('https://domainku.id');
  });

  it('di Vercel tanpa SITE_URL: pakai domain produksi (ditambah https://)', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'berhasil-skd-cpns.vercel.app', VERCEL_URL: 'abc-123.vercel.app' })).toBe(
      'https://berhasil-skd-cpns.vercel.app',
    );
  });

  it('cadangan: VERCEL_URL bila domain produksi tidak tersedia', () => {
    expect(resolveSiteUrl({ VERCEL_URL: 'abc-123.vercel.app' })).toBe('https://abc-123.vercel.app');
  });

  it('tanpa variabel apa pun → undefined (alamat relatif + peringatan saat build)', () => {
    expect(resolveSiteUrl({})).toBeUndefined();
    expect(resolveSiteUrl({ SITE_URL: '  ' })).toBeUndefined();
  });
});
