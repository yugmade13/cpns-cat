// Daftar pengguna yang boleh masuk ke aplikasi.
//
// PERHATIAN: login ini hanya "gerbang" sederhana di browser, BUKAN pengamanan sungguhan.
// Isi file ini ikut terkirim ke browser dan bisa dibaca siapa pun lewat DevTools.
// - Pakai password KHUSUS untuk aplikasi ini; jangan pakai password email/akun pribadi.
// - Username tidak membedakan huruf besar/kecil; password membedakan.
// - Setelah mengubah file ini, build dan deploy ulang aplikasi (npm run build).
// - Menghapus pengguna dari daftar membuatnya otomatis keluar saat aplikasi dibuka lagi.
//   Datanya (bank soal, bookmark) tetap ada di browser, tetapi tidak bisa diakses.

export interface AppUser {
  /** Dipakai untuk login dan sebagai pemilik data di browser. Unik, tanpa spasi. */
  username: string;
  password: string;
  /** Nama yang ditampilkan di aplikasi. */
  name: string;
}

export const USERS: AppUser[] = [
  // Contoh — ganti dengan pengguna dan password milikmu sendiri sebelum dipakai.
  { username: 'demo', password: 'demo123', name: 'Demo 1' },
];
