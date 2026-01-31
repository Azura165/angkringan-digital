"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function AdminSoundSystem() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 1. Inisialisasi Audio & Izin Notifikasi System
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/notification.mp3");
      audioRef.current.load(); // Preload agar instan

      // Minta izin Notifikasi System (Biar muncul pop-up di Windows/HP)
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    // 2. Setup Global Realtime Listener
    // Kita gunakan channel unik agar tidak bentrok dengan halaman orders
    const channel = supabase
      .channel("global-admin-alarm-system")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          // --- A. LOGIC SUARA ---
          if (audioRef.current) {
            try {
              audioRef.current.currentTime = 0;
              const playPromise = audioRef.current.play();

              if (playPromise !== undefined) {
                playPromise.catch((error) => {
                  console.log(
                    "Autoplay diblokir browser (perlu interaksi user):",
                    error,
                  );
                });
              }
            } catch (e) {
              console.error("Audio error:", e);
            }
          }

          // --- B. LOGIC SYSTEM NOTIFICATION (Pop-up Windows/Android) ---
          // Ini yang bikin notif muncul walau tab tertutup/minimize
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const notif = new Notification("💰 ORDER MASUK!", {
              body: `Meja ${payload.new.table_number} - Rp ${parseInt(payload.new.total_price).toLocaleString("id-ID")}`,
              icon: "/icon-192x192.png", // Pastikan ada icon di public (opsional)
              tag: "new-order", // Agar tidak spam menumpuk
              requireInteraction: true, // Notif tidak hilang sampai diklik
            });

            notif.onclick = function () {
              window.focus();
              window.location.href = "/admin/orders";
            };
          }

          // --- C. GETARAN HP (Vibrate Pattern Panjang) ---
          if (navigator.vibrate) {
            // Getar: [Getar, Diam, Getar, Diam, Getar Panjang]
            navigator.vibrate([200, 100, 200, 100, 500]);
          }

          // --- D. TOAST DALAM APLIKASI ---
          toast("Pesanan Masuk! 🔔", {
            description: `Meja ${payload.new.table_number} - Rp ${parseInt(payload.new.total_price).toLocaleString("id-ID")}`,
            duration: 10000, // Tampil 10 detik
            position: "top-right",
            action: {
              label: "Buka",
              onClick: () => (window.location.href = "/admin/orders"),
            },
            style: {
              backgroundColor: "#10B981", // Hijau
              color: "white",
              border: "none",
              fontWeight: "bold",
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null; // Komponen ini "Ghost", tidak merender tampilan
}
