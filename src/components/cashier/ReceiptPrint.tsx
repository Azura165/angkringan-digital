"use client";

import { memo } from "react";

// Helper Format Rupiah
const formatMoney = (num: number) => new Intl.NumberFormat("id-ID").format(num);

export const ReceiptPrint = memo(({ order }: { order: any }) => {
  if (!order) return null;

  // Garis pemisah text-based agar hasil cetak lebih tebal & jelas di thermal
  const line = "--------------------------------";

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page {
            size: 58mm auto; /* Coba paksa ukuran kertas */
            margin: 0mm; 
          }
          body {
            margin: 0px;
            padding: 0px;
            background-color: white;
          }
          /* Sembunyikan header/footer browser */
          @media print {
            html, body {
              height: auto;
              overflow: visible;
            }
          }
        `}
      </style>

      <div className="hidden print:block print:absolute print:inset-0 print:z-[9999] print:bg-white print:w-full print:h-auto">
        {/* Container Struk: Lebar 58mm, Font Monospace Kasir */}
        <div
          className="w-[58mm] mx-auto font-mono text-[10px] leading-tight text-black pb-10 pt-2 px-1 uppercase"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            maxWidth: "58mm",
          }}
        >
          {/* --- HEADER --- */}
          <div className="text-center mb-1">
            <h1 className="font-black text-lg tracking-wider scale-y-110">
              ANGKRINGAN
            </h1>
            <p className="text-[9px] mt-1">Mas Radit & Partners</p>
            <p className="text-[9px]">Jl. Kenangan No. 12</p>
          </div>

          <div className="text-center text-[9px] mb-1">{line}</div>

          {/* --- INFO TRANSAKSI (Sesuai DB) --- */}
          <div className="mb-1">
            <div className="flex justify-between">
              <span>NO:{order.order_code || order.id}</span>
              <span>
                {new Date(order.created_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>
                TGL:{new Date(order.created_at).toLocaleDateString("id-ID")}
              </span>
              <span>KSR:ADMIN</span>
            </div>
            <div className="mt-1">
              <span>
                PLG: {order.customer_name?.substring(0, 18) || "GUEST"}
              </span>
            </div>
            <div>
              <span>
                TYPE:{" "}
                {order.table_number === "Takeaway"
                  ? "BUNGKUS"
                  : `MEJA ${order.table_number}`}
              </span>
            </div>
          </div>

          <div className="text-center text-[9px] mb-1">{line}</div>

          {/* --- ITEMS (Looping Data DB) --- */}
          <div className="space-y-1 mb-1">
            {order.order_items?.map((item: any, idx: number) => (
              <div key={idx}>
                <div className="line-clamp-1 font-bold">{item.menu_name}</div>
                <div className="flex justify-between pl-4">
                  <span>
                    {item.qty} x {formatMoney(item.price)}
                  </span>
                  <span className="font-bold">
                    {formatMoney(item.price * item.qty)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-[9px] mb-1">{line}</div>

          {/* --- TOTALS --- */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-xs font-black">
              <span>TOTAL</span>
              <span>Rp {formatMoney(order.total_price)}</span>
            </div>

            <div className="flex justify-between">
              {/* Ambil data payment_method dari DB */}
              <span>
                BAYAR (
                {order.payment_method
                  ? order.payment_method.toUpperCase()
                  : "TUNAI"}
                )
              </span>
              <span>Rp {formatMoney(order.total_price)}</span>
            </div>

            <div className="flex justify-between">
              <span>KEMBALI</span>
              <span>Rp 0</span>
            </div>
          </div>

          <div className="text-center text-[9px] mb-2">{line}</div>

          {/* --- FOOTER --- */}
          <div className="text-center space-y-1">
            <p className="font-bold">*** LUNAS ***</p>
            <p>TERIMA KASIH</p>
            <p>BARANG YG SUDAH DIBELI</p>
            <p>TIDAK DPT DITUKAR/KEMBALI</p>
            <p className="pt-2 text-[8px]">Powered by Sora POS</p>
          </div>
        </div>
      </div>
    </>
  );
});

ReceiptPrint.displayName = "ReceiptPrint";
