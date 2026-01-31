"use client";

import { QRCodeSVG } from "qrcode.react";

interface Table {
  id: number;
  table_number: string;
  section: string;
  qr_token: string;
}

interface TablePrintLayoutProps {
  tables: Table[];
  storeName: string;
  layoutMode: "portrait" | "landscape";
}

export default function TablePrintLayout({
  tables,
  storeName,
  layoutMode,
}: TablePrintLayoutProps) {
  if (!tables || tables.length === 0) return null;

  return (
    <div className="print-container">
      <style jsx global>{`
        @media print {
          @page {
            /* Pastikan browser merotasi kertas sesuai mode */
            size: A4 ${layoutMode};
            margin: 0mm;
          }

          body {
            background-color: white;
            -webkit-print-color-adjust: exact;
            margin: 0;
          }

          body * {
            visibility: hidden;
          }

          .print-container,
          .print-container * {
            visibility: visible !important;
          }

          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            /* Landscape butuh width lebih lebar di layar preview, tapi di kertas menyesuaikan */
            height: 100%;
            background: white;
            z-index: 99999;

            display: grid;
            /* LOGIKA GRID YANG BENAR:
               Portrait: 1 Kolom (Atas Bawah)
               Landscape: 2 Kolom (Kiri Kanan) 
            */
            grid-template-columns: ${layoutMode === "portrait"
              ? "1fr"
              : "1fr 1fr"};
            grid-auto-rows: ${layoutMode === "portrait" ? "50vh" : "100vh"};
            align-content: start;
          }

          .print-card {
            width: 100%;
            height: 100%; /* Mengikuti grid row height */
            padding: 15px; /* Margin aman dari tepi kertas */
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }

        @media screen {
          .print-container {
            display: none;
          }
        }
      `}</style>

      {tables.map((table) => (
        <div key={table.id} className="print-card">
          {/* Border Potong (Dashed) */}
          <div className="border-2 border-dashed border-zinc-300 w-full h-full p-3 flex items-center justify-center relative rounded-xl">
            {/* KARTU UTAMA (Solid Border) */}
            <div
              className={`border-[5px] border-black w-full h-full rounded-[2rem] flex flex-col items-center justify-between bg-white overflow-hidden shadow-none ${
                layoutMode === "landscape" ? "py-8 px-6" : "py-6 px-4"
              }`}
            >
              {/* Header Text */}
              <div className="text-center w-full mt-2">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500 mb-1">
                  SCAN DISINI
                </p>
                <div className="h-0.5 w-12 bg-black mx-auto mb-2 rounded-full"></div>
                <h3 className="text-xl font-black text-black leading-none uppercase tracking-tighter">
                  UNTUK PESAN
                </h3>
              </div>

              {/* QR Code Area (Flexible Space) */}
              <div className="flex-1 flex items-center justify-center py-2">
                <div className="bg-white p-2 border-2 border-zinc-100 rounded-xl">
                  <QRCodeSVG
                    value={`https://angkringan-app.com?table=${table.id}&token=${table.qr_token}`}
                    /* Ukuran dinamis agar tidak nabrak */
                    size={layoutMode === "landscape" ? 220 : 200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Info Meja (Fixed Height agar tidak geser) */}
              <div className="text-center w-full mb-2">
                {/* Nomor Meja Besar */}
                <div className="relative inline-block">
                  <div className="bg-black text-white px-10 py-2 rounded-full shadow-lg mb-2 relative z-10">
                    <h1 className="text-5xl font-black tracking-tighter leading-none">
                      {table.table_number.replace(/Meja\s*/i, "")}
                    </h1>
                  </div>
                  {/* Shadow decoration */}
                  <div className="absolute top-2 left-2 w-full h-full bg-zinc-200 rounded-full -z-0"></div>
                </div>

                {/* Nama Section */}
                <div className="border-t-2 border-zinc-100 w-3/4 mx-auto pt-2 mt-2">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-700">
                    {table.section}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="w-full text-center mb-1">
                <p className="text-[8px] font-bold text-zinc-400 tracking-[0.2em] uppercase">
                  POWERED BY {storeName || "ANGKRINGAN"}
                </p>
              </div>

              {/* Dekorasi Watermark */}
              <div className="absolute -bottom-10 -right-10 opacity-[0.03] pointer-events-none rotate-12">
                <QRCodeSVG value="watermark" size={300} />
              </div>
            </div>

            {/* Label Gunting */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 bg-white text-zinc-400 -rotate-90 text-[8px] px-1 border border-zinc-200 rounded flex items-center gap-1">
              <span>✂️</span> POTONG
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
