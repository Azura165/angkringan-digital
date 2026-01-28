import withPWAInit from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const withPWA = withPWAInit({
  dest: "public", // Folder output service worker
  register: true, // Auto register SW
  skipWaiting: true, // Auto update SW saat ada versi baru
  disable: process.env.NODE_ENV === "development", // Matikan PWA di mode dev
});

export default withPWA(nextConfig);
