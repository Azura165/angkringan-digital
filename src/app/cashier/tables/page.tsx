"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Armchair,
  Users,
  RotateCcw,
  CheckCircle2,
  BellRing,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Utensils,
  CalendarClock,
  UserPlus,
  Save,
  MapPin,
  Clock,
  Minus,
  Plus,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// --- CONFIG ---
const CACHE_KEY = "cashier_tables_v6"; // Bump version

// --- TYPES ---
interface Table {
  id: number;
  table_number: string;
  section: string | null; // Sesuai DB (bukan slug)
  status: "available" | "occupied" | "reserved";
  current_pax: number | null;
  service_request: string | null;
  updated_at: string;
}

// --- HELPER: HITUNG DURASI ---
const getDuration = (dateString: string) => {
  if (!dateString) return "Baru saja";
  const start = new Date(dateString).getTime();
  const now = new Date().getTime();
  const diff = Math.floor((now - start) / 60000); // menit

  if (diff < 1) return "Baru saja";
  if (diff < 60) return `${diff} mnt`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}j ${m}m`;
};

// --- COMPONENT: STATS CARD ---
const StatsCard = memo(({ icon: Icon, label, value, color, bg }: any) => (
  <div
    className={`border border-white/5 p-4 rounded-2xl flex items-center gap-4 ${bg}`}
  >
    <div className={`p-3 rounded-xl ${color} bg-black/20`}>
      <Icon size={20} />
    </div>
    <div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
        {label}
      </p>
    </div>
  </div>
));
StatsCard.displayName = "StatsCard";

// --- COMPONENT: TABLE CARD ---
const TableCard = memo(
  ({ table, onClick }: { table: Table; onClick: (t: Table) => void }) => {
    const isOccupied = table.status === "occupied";
    const isReserved = table.status === "reserved";
    const isRequest = !!table.service_request;

    // Visual Styles
    let containerStyle = "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700";
    let iconColor = "text-emerald-500";
    let statusBadge =
      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    let statusText = "AVAILABLE";
    let MainIcon = Armchair;

    if (isRequest) {
      containerStyle =
        "border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.2)] animate-pulse";
      iconColor = "text-yellow-500";
      statusBadge = "bg-yellow-500 text-black font-bold border-yellow-500";
      statusText = "PANGGILAN";
      MainIcon = BellRing;
    } else if (isOccupied) {
      containerStyle =
        "border-red-500/30 bg-red-900/10 hover:border-red-500/50";
      iconColor = "text-red-500";
      statusBadge = "bg-red-500/10 text-red-500 border-red-500/20";
      statusText = "TERISI";
      MainIcon = Utensils;
    } else if (isReserved) {
      containerStyle =
        "border-purple-500/30 bg-purple-900/10 hover:border-purple-500/50";
      iconColor = "text-purple-500";
      statusBadge = "bg-purple-500/10 text-purple-500 border-purple-500/20";
      statusText = "RESERVED";
      MainIcon = CalendarClock;
    }

    return (
      <div
        onClick={() => onClick(table)}
        className={`relative aspect-square rounded-3xl border-2 transition-all duration-300 cursor-pointer group active:scale-[0.98] flex flex-col justify-between p-4 overflow-hidden ${containerStyle}`}
      >
        {/* Header: Nomor & Pax/Section */}
        <div className="flex justify-between w-full items-start z-10">
          <span
            className={`text-2xl font-black tracking-tighter truncate max-w-[70%] ${isOccupied || isReserved ? "text-white" : "text-zinc-500"}`}
          >
            {table.table_number.replace("Meja ", "")}{" "}
            {/* Tampilkan Angka Saja */}
          </span>
          {table.current_pax ? (
            <div className="flex items-center gap-1 text-[10px] font-bold bg-black/40 px-2 py-1 rounded-full text-zinc-300 border border-white/5">
              <Users size={10} /> {table.current_pax}
            </div>
          ) : (
            table.section && (
              <div className="flex items-center gap-1 text-[9px] font-bold bg-white/5 px-2 py-1 rounded-full text-zinc-500 uppercase tracking-wide">
                {table.section}
              </div>
            )
          )}
        </div>

        {/* Icon Tengah */}
        <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:scale-110 transition-transform duration-500">
          <div
            className={`p-4 rounded-full bg-black/20 backdrop-blur-sm shadow-inner ${iconColor}`}
          >
            <MainIcon size={32} className={isRequest ? "animate-bounce" : ""} />
          </div>
        </div>

        {/* Footer: Status & Durasi */}
        <div className="z-10 mt-auto flex flex-col gap-1">
          {isOccupied && (
            <div className="flex items-center justify-center gap-1 text-[9px] text-zinc-400 font-mono bg-black/40 rounded-md py-0.5">
              <Clock size={8} /> {getDuration(table.updated_at)}
            </div>
          )}
          <span
            className={`block text-[9px] uppercase tracking-widest px-1 py-1.5 rounded-lg border w-full text-center font-bold shadow-sm ${statusBadge}`}
          >
            {statusText}
          </span>
        </div>
      </div>
    );
  },
);
TableCard.displayName = "TableCard";

// --- MAIN PAGE ---
export default function CashierTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "occupied" | "reserved" | "request"
  >("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Action State
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputPax, setInputPax] = useState<number>(0);

  // Timer Update Durasi
  useEffect(() => {
    const timer = setInterval(() => {
      setTables((prev) => [...prev]);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. FETCH TABLES (Safe Select)
  const fetchTables = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      // Gunakan select('*') agar aman jika nama kolom berubah
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      if (data) {
        setTables(data as Table[]);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      toast.error("Gagal sinkronisasi meja");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 2. REALTIME
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setTables(JSON.parse(cached));
        setIsLoading(false);
      } catch (e) {}
    }
    fetchTables();

    const channel = supabase
      .channel("cashier-tables-v6")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tables" },
        (payload) => {
          const newTable = payload.new as Table;
          const oldTable = payload.old as Table;

          setTables((prev) =>
            prev.map((t) => (t.id === newTable.id ? { ...t, ...newTable } : t)),
          );

          // Notifikasi
          if (newTable.service_request && !oldTable.service_request) {
            const audio = new Audio("/sounds/notification.mp3");
            audio.play().catch(() => {});
            toast.warning(
              `🔔 Meja ${newTable.table_number}: ${newTable.service_request}`,
            );
          }
          if (
            newTable.status === "occupied" &&
            oldTable.status === "available"
          ) {
            const audio = new Audio("/sounds/ding.mp3");
            audio.play().catch(() => {});
            toast.success(`👥 Meja ${newTable.table_number} terisi!`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTables]);

  // 3. ACTIONS
  const handlePaxChange = (delta: number) => {
    setInputPax((prev) => Math.max(0, prev + delta));
  };

  const handleUpdateStatus = async (
    newStatus: "available" | "occupied" | "reserved",
  ) => {
    if (!selectedTable) return;
    setIsProcessing(true);

    const payload: any = {
      status: newStatus,
      service_request: null,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "available") payload.current_pax = null;
    else if (newStatus === "occupied" || newStatus === "reserved") {
      payload.current_pax = inputPax || 1;
    }

    try {
      setTables((prev) =>
        prev.map((t) => (t.id === selectedTable.id ? { ...t, ...payload } : t)),
      );
      setIsDialogOpen(false);

      const { error } = await supabase
        .from("tables")
        .update(payload)
        .eq("id", selectedTable.id);
      if (error) throw error;

      const msg = newStatus === "available" ? "Dibersihkan" : "Diupdate";
      toast.success(`Meja ${selectedTable.table_number} ${msg}`);
    } catch (e) {
      toast.error("Gagal update status");
      fetchTables(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. MEMOIZED DATA
  const uniqueLocations = useMemo(() => {
    const sections = tables.map((t) => t.section).filter(Boolean);
    return Array.from(new Set(sections));
  }, [tables]);

  const stats = useMemo(
    () => ({
      total: tables.length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      available: tables.filter((t) => t.status === "available").length,
      reserved: tables.filter((t) => t.status === "reserved").length,
      requests: tables.filter((t) => t.service_request !== null).length,
    }),
    [tables],
  );

  const filteredTables = useMemo(() => {
    let data = tables;
    if (statusFilter !== "all" && statusFilter !== "request")
      data = data.filter((t) => t.status === statusFilter);
    if (statusFilter === "request")
      data = data.filter((t) => t.service_request !== null);
    if (locationFilter !== "all")
      data = data.filter((t) => t.section === locationFilter);
    if (search)
      data = data.filter((t) =>
        t.table_number.toLowerCase().includes(search.toLowerCase()),
      );
    return data;
  }, [tables, statusFilter, locationFilter, search]);

  return (
    <div className="p-4 md:p-6 pb-24 max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
      {/* STATS HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatsCard
          icon={Armchair}
          label="Total"
          value={stats.total}
          color="text-white"
          bg="bg-zinc-900"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Kosong"
          value={stats.available}
          color="text-emerald-500"
          bg="bg-zinc-900"
        />
        <StatsCard
          icon={Users}
          label="Terisi"
          value={stats.occupied}
          color="text-red-500"
          bg="bg-zinc-900"
        />
        <StatsCard
          icon={CalendarClock}
          label="Reserved"
          value={stats.reserved}
          color="text-purple-500"
          bg="bg-zinc-900"
        />
        <StatsCard
          icon={BellRing}
          label="Panggilan"
          value={stats.requests}
          color={stats.requests > 0 ? "text-yellow-500" : "text-zinc-500"}
          bg={
            stats.requests > 0
              ? "bg-yellow-500/10 border-yellow-500/20"
              : "bg-zinc-900"
          }
        />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-4 bg-zinc-900/50 p-3 rounded-3xl border border-white/5 backdrop-blur-sm sticky top-0 z-20 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide w-full md:w-auto">
            {[
              { id: "all", label: "Semua", icon: LayoutGrid },
              { id: "available", label: "Kosong", icon: CheckCircle2 },
              { id: "occupied", label: "Terisi", icon: Users },
              { id: "reserved", label: "Booked", icon: CalendarClock },
              { id: "request", label: "Panggilan", icon: BellRing },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${statusFilter === tab.id ? "bg-white text-black border-white shadow-lg" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"}`}
              >
                <tab.icon size={12} /> {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-zinc-500"
                size={14}
              />
              <Input
                placeholder="Cari meja..."
                className="pl-9 bg-zinc-950 border-zinc-800 h-9 w-full md:w-48 text-xs rounded-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => fetchTables(true)}
              className={`border-zinc-800 bg-zinc-950 hover:text-white h-9 w-9 rounded-full ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
        {uniqueLocations.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide border-t border-white/5 pt-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase self-center mr-2">
              Area:
            </span>
            <button
              onClick={() => setLocationFilter("all")}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${locationFilter === "all" ? "bg-zinc-700 text-white" : "bg-transparent text-zinc-500 hover:text-zinc-300"}`}
            >
              SEMUA
            </button>
            {uniqueLocations.map((sec) => (
              <button
                key={sec}
                onClick={() => setLocationFilter(sec!)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${locationFilter === sec ? "bg-zinc-700 text-white" : "bg-transparent text-zinc-500 hover:text-zinc-300"}`}
              >
                {sec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {isLoading && tables.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-zinc-900/30 rounded-3xl animate-pulse border border-white/5"
            />
          ))
        ) : filteredTables.length === 0 ? (
          <div className="col-span-full py-20 text-center text-zinc-500 flex flex-col items-center">
            <Armchair size={48} className="opacity-20 mb-4" />
            <p className="text-sm">Tidak ada meja di area ini.</p>
          </div>
        ) : (
          filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => {
                setSelectedTable(table);
                setInputPax(table.current_pax || 0);
                setIsDialogOpen(true);
              }}
            />
          ))
        )}
      </div>

      {/* --- MODERN MODAL DESIGN (Clean Typography, No Circle) --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[340px] rounded-3xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Kelola {selectedTable?.table_number}</DialogTitle>
            <DialogDescription>Aksi Meja</DialogDescription>
          </DialogHeader>

          {/* HEADER: WIDE BANNER STYLE */}
          <div
            className={`relative px-6 py-10 text-left overflow-hidden border-b border-white/5 ${selectedTable?.status === "occupied" ? "bg-red-950/50" : selectedTable?.status === "reserved" ? "bg-purple-950/50" : "bg-emerald-950/50"}`}
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-10 -mt-10 ${selectedTable?.status === "occupied" ? "bg-red-600/40" : selectedTable?.status === "reserved" ? "bg-purple-600/40" : "bg-emerald-600/40"}`}
            />

            <div className="relative z-10">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-1">
                KELOLA MEJA
              </span>
              <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-2">
                {selectedTable?.table_number.replace("Meja ", "")}{" "}
                {/* Tampilkan Angka Besar */}
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full animate-pulse ${selectedTable?.status === "occupied" ? "bg-red-500" : selectedTable?.status === "reserved" ? "bg-purple-500" : "bg-emerald-500"}`}
                />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                  {selectedTable?.status}{" "}
                  {selectedTable?.section ? `• ${selectedTable.section}` : ""}
                </span>
              </div>
              {selectedTable?.status === "occupied" && (
                <div className="mt-4 inline-flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                  <Clock size={12} className="text-zinc-400" />
                  <span className="text-xs font-mono text-white">
                    Durasi: {getDuration(selectedTable.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {selectedTable?.service_request && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex items-center gap-3 animate-pulse">
                <BellRing className="text-yellow-500" size={20} />
                <div>
                  <p className="text-yellow-500 font-bold text-xs">
                    PANGGILAN PELAYAN
                  </p>
                  <p className="text-yellow-100/70 text-xs">
                    "{selectedTable.service_request}"
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1 flex items-center gap-1">
                <UserPlus size={10} /> Jumlah Tamu (Pax)
              </label>
              <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePaxChange(-1)}
                  className="h-10 w-10 rounded-xl hover:bg-zinc-800 text-zinc-400"
                >
                  <Minus size={18} />
                </Button>
                <Input
                  type="number"
                  value={inputPax}
                  onChange={(e) => setInputPax(parseInt(e.target.value) || 0)}
                  className="flex-1 text-center bg-transparent border-none text-2xl font-bold h-10 focus-visible:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePaxChange(1)}
                  className="h-10 w-10 rounded-xl hover:bg-white hover:text-black bg-zinc-800 text-white"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {selectedTable?.status === "available" && (
                <>
                  <Button
                    onClick={() => handleUpdateStatus("occupied")}
                    disabled={isProcessing}
                    className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl h-12"
                  >
                    Check In
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus("reserved")}
                    disabled={isProcessing}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl h-12"
                  >
                    Reservasi
                  </Button>
                </>
              )}

              {(selectedTable?.status === "occupied" ||
                selectedTable?.status === "reserved") && (
                <>
                  <Button
                    onClick={() => handleUpdateStatus(selectedTable.status)}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl h-12 col-span-2 shadow-lg shadow-blue-900/20"
                  >
                    <Save size={16} className="mr-2" /> Simpan Pax
                  </Button>
                  <div className="col-span-2 border-t border-zinc-800 my-1" />
                  <Button
                    onClick={() => handleUpdateStatus("available")}
                    disabled={isProcessing}
                    className="bg-zinc-800 hover:bg-red-900/30 hover:text-red-400 hover:border-red-500/30 text-zinc-400 font-bold rounded-xl h-12 col-span-2 border border-zinc-700 transition-all"
                  >
                    <RotateCcw size={16} className="mr-2" />{" "}
                    {selectedTable.status === "reserved"
                      ? "Batal Reservasi"
                      : "Checkout / Bersihkan"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0 sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="text-zinc-500 hover:text-white text-xs"
            >
              Tutup Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
