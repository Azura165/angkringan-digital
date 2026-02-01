"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";

export function AdminSoundSystem() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Cek apakah user sedang di area Kasir atau Admin
  const isCashierArea = pathname?.startsWith("/cashier");

  useEffect(() => {
    // 1. Inisialisasi Audio
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/notification.mp3");
      audioRef.current.load();

      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    }

    // 2. Realtime Listener
    const channel = supabase
      .channel("global-alarm-system-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          // Cek Mute State dari LocalStorage
          const isMuted = localStorage.getItem("app_is_muted") === "true";

          // A. Mainkan Suara (Jika tidak di-mute)
          if (audioRef.current && !isMuted) {
            try {
              audioRef.current.currentTime = 0;
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch((e) => console.log("Autoplay block:", e));
              }
            } catch (e) {
              console.error("Audio error:", e);
            }
          }

          // Tentukan Target Redirect (Admin ke Admin, Kasir ke Kasir)
          const targetUrl = isCashierArea ? "/cashier/orders" : "/admin/orders";

          // B. System Notification (Background)
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const notif = new Notification("🔔 ORDER BARU!", {
              body: `Meja ${payload.new.table_number} - Rp ${parseInt(payload.new.total_price).toLocaleString("id-ID")}`,
              icon: "/icon-192x192.png",
              tag: "new-order",
            });
            notif.onclick = () => {
              window.focus();
              window.location.href = targetUrl;
            };
          }

          // C. Getaran HP
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

          // D. Toast Dalam Aplikasi
          toast("Pesanan Masuk! 🔔", {
            description: `Meja ${payload.new.table_number}`,
            duration: 8000,
            position: "top-right",
            action: {
              label: "Buka",
              onClick: () => router.push(targetUrl),
            },
            style: {
              backgroundColor: "#10B981",
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
  }, [isCashierArea, router]);

  return null;
}
