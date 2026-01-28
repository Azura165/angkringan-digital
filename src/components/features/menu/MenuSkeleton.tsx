import { Skeleton } from "@/components/ui/skeleton";

export function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
      {/* Kita buat 6 kotak bayangan biar kelihatan penuh */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col space-y-3">
          {/* Tulang Gambar (Kotak Besar) */}
          <Skeleton className="h-32 w-full rounded-2xl" />

          <div className="space-y-2 p-1">
            {/* Tulang Judul (Garis Panjang) */}
            <Skeleton className="h-4 w-3/4" />

            {/* Tulang Deskripsi (Garis Pendek) */}
            <Skeleton className="h-3 w-full" />

            <div className="flex justify-between items-center pt-2">
              {/* Tulang Harga */}
              <Skeleton className="h-4 w-1/3" />
              {/* Tulang Tombol (+) */}
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
