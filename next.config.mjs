import withPWAInit from "@ducanh2912/next-pwa"; // <--- Pastikan pakai @ducanh2912

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // <--- INI OBAT ERROR TURBOPACK YANG TADI
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // PWA mati di mode dev biar enteng
  // Settingan tambahan biar icon maskable aman
  workboxOptions: {
    disableDevLogs: true,
  },
});

export default withPWA(nextConfig);
