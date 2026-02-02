# 🥗 KasirApp - Modern POS System for Angkringan

Sistem Point of Sale (POS) & Manajemen Restoran berbasis Web modern yang dirancang khusus untuk bisnis kuliner (Angkringan/Cafe). Dibangun dengan fokus pada kecepatan (Realtime), kemudahan penggunaan (UX), dan transparansi keuangan.

🔗 **Live Demo:** [https://angkringan-digital.vercel.app/](https://angkringan-digital.vercel.app/)

![Project Status](https://img.shields.io/badge/Status-Production_Ready-emerald)
![Tech Stack](https://img.shields.io/badge/Tech-Next.js_14_TS-black)
![Database](https://img.shields.io/badge/DB-Supabase_PostgreSQL-green)

## 🚀 Tech Stack & Tools

Aplikasi ini dibangun menggunakan teknologi terkini untuk menjamin performa tinggi:

- **Frontend:** [Next.js 14 (App Router)](https://nextjs.org/) - React Framework.
- **Language:** [TypeScript](https://www.typescriptlang.org/) - Type safety & developer experience.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS.
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/).
- **Icons:** [Lucide React](https://lucide.dev/).
- **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL) - Realtime Database.
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`) + Context.
- **Notifications:** [Sonner](https://sonner.emilkowal.ski/).

---

## ✨ Fitur Utama (Features)

### 🏪 1. Cashier POS (Point of Sale)

- **Realtime Menu:** Katalog menu sinkron otomatis dengan database.
- **Smart Cart:** Keranjang belanja interaktif dengan kalkulasi total otomatis.
- **Quick Payment:** Tombol uang cepat & kalkulator kembalian.
- **Receipt Printing:** Cetak struk thermal (58mm/80mm) yang rapi.
- **Offline Mode UI:** Indikator deteksi koneksi internet.

### 🪑 2. Table Management (Manajemen Meja)

- **Visual Layout:** Grid meja dengan indikator warna (Available/Occupied/Reserved).
- **Realtime Status:** Status meja berubah instan saat ada pesanan masuk.
- **Duration Tracker:** Melacak durasi pelanggan duduk.
- **Service Request:** Notifikasi jika pelanggan memanggil pelayan.

### 📊 3. Admin Dashboard (Owner View)

- **Financial Overview:** Laporan Omzet, Pengeluaran, dan **Laba Bersih (Net Profit)**.
- **Trend Analysis:** Grafik penjualan harian/bulanan.
- **Shift Reports:** Audit setoran kasir (Selisih uang sistem vs aktual).
- **Expense Tracking:** Input pengeluaran operasional (Beli Gas, Es Batu, dll).

### ⚙️ 4. Full Management Modules

- **Menu Management:** Tambah/Edit/Hapus menu, kategori, dan stok.
- **Order History:** Riwayat pesanan lengkap dengan filter status.
- **Reviews:** Memantau ulasan dan rating dari pelanggan.
- **Store Settings:** Pengaturan jam operasional toko.

---

## 🛠️ Cara Instalasi (Local Development)

1.  **Clone Repository**

    ```bash
    git clone [https://github.com/username/angkringan-saas.git](https://github.com/username/angkringan-saas.git)
    cd angkringan-saas
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    # atau
    bun install
    ```

3.  **Setup Environment Variables**
    Buat file `.env.local` dan isi dengan kredensial Supabase Anda:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Jalankan Server**
    ```bash
    npm run dev
    ```
    Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🤝 Credits

Project ini dikembangkan oleh **Radithya Zulifa**.

_Powered by Kopi & Code._ ☕
