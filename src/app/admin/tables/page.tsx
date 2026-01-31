"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Trash2,
  Printer,
  Search,
  RotateCcw,
  CheckCircle2,
  User,
  BellRing,
  Loader2,
  MoreVertical,
  Armchair,
  Sparkles,
  LayoutGrid,
  LayoutList,
  Users,
  RefreshCw,
  AlertTriangle,
  FileText,
  Smartphone,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import TablePrintLayout from "@/components/admin/TablePrintLayout";

// --- TYPES ---
interface Table {
  id: number;
  table_number: string;
  section: string;
  status: "available" | "occupied" | "reserved" | "cleaning";
  qr_token: string;
  current_pax: number;
  service_request: string | null;
  service_requested_at: string | null;
  updated_at?: string;
}

const CACHE_KEY = "admin_tables_cache_v1"; // Cache Key

// --- SUB-COMPONENT (TABLE CARD) ---
const TableCard = memo(
  ({
    table,
    viewMode,
    onQuickStatus,
    onPrintSingle,
    onEdit,
    onDeleteClick,
    onUpdatePax,
    originUrl,
  }: {
    table: Table;
    viewMode: "grid" | "list";
    onQuickStatus: (id: number, status: string) => void;
    onPrintSingle: (t: Table, mode: "portrait" | "landscape") => void;
    onEdit: (t: Table) => void;
    onDeleteClick: (t: Table) => void;
    onUpdatePax: (id: number, pax: number) => void;
    originUrl: string;
  }) => {
    // URL QR Code Otomatis (Mengarah ke User Side)
    // Contoh: https://namatoko.com?table=5
    const qrUrl = `${originUrl}?table=${table.table_number}`;

    const containerClass = useMemo(() => {
      const base =
        "relative group transition-all duration-300 hover:scale-[1.01] shadow-sm";
      const statusColor = table.service_request
        ? "bg-red-500/10 border-red-500/50 animate-pulse ring-1 ring-red-500/50"
        : table.status === "available"
          ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600"
          : table.status === "occupied"
            ? "bg-emerald-950/40 border-emerald-500/50"
            : "bg-orange-950/40 border-orange-500/50";

      return viewMode === "grid"
        ? `p-4 rounded-2xl border flex flex-col justify-between h-40 ${base} ${statusColor}`
        : `p-3 rounded-xl border flex items-center justify-between gap-4 ${base} ${statusColor}`;
    }, [table.status, table.service_request, viewMode]);

    const StatusBadge = () => {
      if (table.service_request)
        return (
          <span className="text-red-400 text-[10px] font-bold flex items-center gap-1 animate-bounce">
            <BellRing size={12} />{" "}
            {table.service_request === "bill" ? "Minta Bill" : "Panggil"}
          </span>
        );
      if (table.status === "available")
        return (
          <span className="text-zinc-500 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 size={12} /> KOSONG
          </span>
        );
      if (table.status === "occupied")
        return (
          <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
            <User size={12} /> TERISI
          </span>
        );
      return (
        <span className="text-orange-500 text-[10px] font-bold flex items-center gap-1">
          <RotateCcw size={12} /> BERSIH
        </span>
      );
    };

    const DropdownAction = () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white rounded-full"
          >
            <MoreVertical size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-zinc-950 border-zinc-800 text-white shadow-xl min-w-[140px]"
          align="end"
        >
          <DropdownMenuItem
            onClick={() => onQuickStatus(table.id, "available")}
            className="text-[10px] cursor-pointer"
          >
            ✅ Set Kosong
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onQuickStatus(table.id, "occupied")}
            className="text-[10px] cursor-pointer"
          >
            👤 Set Terisi
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-[10px] cursor-pointer">
              🖨️ Print QR
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-zinc-950 border-zinc-800 text-white">
              <DropdownMenuItem
                onClick={() => onPrintSingle(table, "portrait")}
                className="text-[10px] cursor-pointer"
              >
                <FileText size={12} className="mr-2" /> Portrait
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onPrintSingle(table, "landscape")}
                className="text-[10px] cursor-pointer"
              >
                <Smartphone size={12} className="mr-2 rotate-90" /> Landscape
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={() => onEdit(table)}
            className="text-[10px] cursor-pointer"
          >
            ✏️ Edit Meja
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem
            onClick={() => onDeleteClick(table)}
            className="text-red-500 text-[10px] cursor-pointer hover:text-red-400 hover:bg-red-500/10"
          >
            🗑️ Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    if (viewMode === "list") {
      return (
        <div className={containerClass}>
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded">
              <QRCodeSVG value={qrUrl} size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {table.table_number}
              </h3>
              <p className="text-[10px] text-zinc-500">{table.section}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-center">
            <StatusBadge />
          </div>
          <div className="flex items-center gap-2">
            <DropdownAction />
          </div>
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-white text-lg leading-none">
              {table.table_number}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">{table.section}</p>
          </div>
          <div className="bg-white p-1 rounded-md shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
            <QRCodeSVG value={qrUrl} size={32} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center py-2 gap-2">
          <div className="flex justify-between items-center">
            <StatusBadge />
            {table.status === "occupied" && (
              <div
                className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded cursor-pointer hover:bg-black/40 active:scale-95 transition-transform"
                onClick={() =>
                  onUpdatePax(table.id, (table.current_pax || 0) + 1)
                }
              >
                <Users size={10} />{" "}
                <span className="text-[10px] font-bold">
                  {table.current_pax} Org
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-auto">
          <DropdownAction />
          {table.status === "occupied" || table.service_request ? (
            <Button
              onClick={() => onQuickStatus(table.id, "available")}
              size="sm"
              className="h-6 text-[9px] bg-white text-black hover:bg-zinc-200 shadow-sm font-bold"
            >
              {table.service_request ? "Respon" : "Selesai"}
            </Button>
          ) : (
            <span className="text-[9px] text-zinc-600 font-medium">
              Standby
            </span>
          )}
        </div>
      </div>
    );
  },
);
TableCard.displayName = "TableCard";

// --- MAIN PAGE ---
export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [tablesToPrint, setTablesToPrint] = useState<Table[]>([]);
  const [storeName, setStoreName] = useState("Angkringan App");
  const [printLayout, setPrintLayout] = useState<"portrait" | "landscape">(
    "portrait",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "occupied" | "request"
  >("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [originUrl, setOriginUrl] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableName, setTableName] = useState("");
  const [tableSection, setTableSection] = useState("Indoor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteTableName, setDeleteTableName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // --- INIT & FETCH ---
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsLoading(true);

    const [t, s] = await Promise.all([
      supabase.from("tables").select("*").order("id", { ascending: true }),
      supabase.from("store_config").select("store_name").single(),
    ]);

    if (t.data) {
      setTables(t.data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(t.data)); // SIMPAN CACHE
    }
    if (s.data) setStoreName(s.data.store_name);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);

      // --- LOGIC RESET BADGE (Hapus notifikasi di sidebar) ---
      // Kita tidak pakai Timestamp untuk tables, karena table itu state (status), bukan log.
      // Jadi kita anggap kalau admin buka halaman ini, dia sudah lihat semua status meja.
      // Tapi untuk simplifikasi di layout, kita bisa pakai teknik timestamp juga jika logic layout menggunakannya.
      // Namun, logic layout kita menghitung count realtime. Jadi badge akan hilang HANYA jika status meja kembali ke 'available'.
      // TAPI, jika ingin "Mark as Read" (Badge hilang walau meja masih terisi/ada request), kita simpan timestamp.
      // Di Layout.tsx sebelumnya, kita belum menerapkan timestamp untuk tables, hanya orders.
      // Untuk Tables, badge menunjukkan "Current Active Issues". Jadi badge TIDAK BOLEH hilang otomatis sampai admin menyelesaikan masalahnya (Respon panggilan / Set Kosong).
      // Ini adalah praktik terbaik untuk manajemen meja. Badge = Action Required.

      // --- LOGIC CACHE ---
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setTables(JSON.parse(cached));
        setIsLoading(false);
      }
    }

    fetchData();

    // REALTIME LISTENER (Tabel 'tables')
    const channel = supabase
      .channel("admin-tables-live-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload) => {
          if (payload.eventType === "INSERT")
            setTables((p) => [...p, payload.new as Table]);
          else if (payload.eventType === "UPDATE")
            setTables((p) =>
              p.map((t) =>
                t.id === payload.new.id ? (payload.new as Table) : t,
              ),
            );
          else if (payload.eventType === "DELETE")
            setTables((p) => p.filter((t) => t.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Update Cache when tables change
  useEffect(() => {
    if (tables.length > 0)
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(tables));
  }, [tables]);

  // --- HANDLERS (MEMOIZED) ---
  const handlePrint = useCallback(
    (input: Table | Table[], mode: "portrait" | "landscape") => {
      const targets = Array.isArray(input) ? input : [input];
      setTablesToPrint(targets);
      setPrintLayout(mode);
      setTimeout(() => window.print(), 100);
    },
    [],
  );

  const handleQuickStatus = useCallback(async (id: number, status: string) => {
    // Optimistic Update
    setTables((p) =>
      p.map((t) =>
        t.id === id
          ? {
              ...t,
              status: status as any,
              service_request: null,
              current_pax: status === "available" ? 0 : t.current_pax,
            }
          : t,
      ),
    );
    await supabase
      .from("tables")
      .update({
        status,
        service_request: null,
        current_pax: status === "available" ? 0 : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    toast.success("Status diperbarui");
  }, []);

  const handleUpdatePax = useCallback(async (id: number, pax: number) => {
    const p = pax > 10 ? 1 : pax;
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, current_pax: p } : t)),
    );
    await supabase.from("tables").update({ current_pax: p }).eq("id", id);
  }, []);

  // CRUD Handlers
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data sinkron");
    }, 800);
  };
  const openModal = useCallback((table?: Table) => {
    if (table) {
      setEditingTable(table);
      setTableName(table.table_number);
      setTableSection(table.section);
    } else {
      setEditingTable(null);
      setTableName("");
      setTableSection("Indoor");
    }
    setIsModalOpen(true);
  }, []);
  const handleSaveTable = async () => {
    if (!tableName) return;
    setIsSubmitting(true);
    const payload = { table_number: tableName, section: tableSection };
    const req = editingTable
      ? supabase.from("tables").update(payload).eq("id", editingTable.id)
      : supabase.from("tables").insert(payload);
    const { error } = await req;
    if (!error) {
      toast.success(editingTable ? "Update sukses" : "Meja baru dibuat");
      setIsModalOpen(false);
    } else toast.error("Gagal simpan");
    setIsSubmitting(false);
  };
  const handleResetAllConfirm = async () => {
    setIsSubmitting(true);
    await supabase
      .from("tables")
      .update({ status: "available", service_request: null, current_pax: 0 })
      .neq("status", "available");
    toast.success("Semua meja dikosongkan!");
    setIsSubmitting(false);
    setIsResetModalOpen(false);
  };
  const handleDeleteClick = useCallback((t: Table) => {
    setDeleteId(t.id);
    setDeleteTableName(t.table_number);
  }, []);
  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const { error } = await supabase.from("tables").delete().eq("id", deleteId);
    if (!error) {
      toast.success("Terhapus");
      setDeleteId(null);
    } else toast.error("Gagal");
    setIsDeleting(false);
  };

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSearch = t.table_number
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchFilter =
        statusFilter === "all"
          ? true
          : statusFilter === "request"
            ? !!t.service_request
            : t.status === statusFilter;
      return matchSearch && matchFilter;
    });
  }, [tables, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: tables.length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      requests: tables.filter((t) => t.service_request).length,
    }),
    [tables],
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Armchair className="text-orange-500" /> Manajemen Meja
          </h1>
          <p className="text-xs text-zinc-400">
            Monitor {stats.total} meja ({stats.occupied} terisi).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center w-full xl:w-auto">
          {stats.requests > 0 && (
            <div className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 border border-red-500/50 mr-auto xl:mr-0">
              <BellRing size={14} /> {stats.requests} Panggilan!
            </div>
          )}
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <LayoutList size={16} />
            </button>
          </div>
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            className="border-zinc-800 text-zinc-400 hover:text-white h-10 px-3"
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </Button>
          <Button
            onClick={() => setIsResetModalOpen(true)}
            variant="outline"
            className="border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 h-10 px-3"
          >
            <Sparkles size={16} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-zinc-800 text-zinc-400 hover:text-white h-10 gap-2"
              >
                <Printer size={16} /> Print Semua <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="bg-zinc-950 border-zinc-800 text-white shadow-xl"
              align="end"
            >
              <DropdownMenuLabel className="text-xs text-zinc-500">
                Pilih Layout
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handlePrint(tables, "portrait")}
                className="cursor-pointer"
              >
                <FileText size={14} className="mr-2" /> Portrait (Tegak)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePrint(tables, "landscape")}
                className="cursor-pointer"
              >
                <Smartphone size={14} className="mr-2 rotate-90" /> Landscape
                (Lebar)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => openModal()}
            className="bg-orange-600 hover:bg-orange-500 text-white shadow-lg h-10"
          >
            <Plus size={16} className="mr-2" /> Tambah
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden sticky top-[68px] z-20 bg-zinc-950/90 backdrop-blur-md py-2 -mx-4 px-4 border-b border-white/5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <Input
            placeholder="Cari nomor meja..."
            className="pl-9 bg-zinc-900 border-zinc-800 h-9 text-xs focus:ring-1 focus:ring-orange-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { id: "all", label: "Semua", count: stats.total },
            {
              id: "available",
              label: "Kosong",
              count: stats.total - stats.occupied,
            },
            { id: "occupied", label: "Terisi", count: stats.occupied },
            { id: "request", label: "Panggilan", count: stats.requests },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold capitalize whitespace-nowrap border transition-all flex items-center gap-2 ${statusFilter === f.id ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"}`}
            >
              {f.label}{" "}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[8px] ${statusFilter === f.id ? "bg-black text-white" : "bg-zinc-800"}`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* LIST CONTENT */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 print:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-zinc-900 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          className={`print:hidden ${viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "flex flex-col gap-2"}`}
        >
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              viewMode={viewMode}
              onQuickStatus={handleQuickStatus}
              onPrintSingle={handlePrint}
              onEdit={openModal}
              onDeleteClick={handleDeleteClick}
              onUpdatePax={handleUpdatePax}
              originUrl={originUrl}
            />
          ))}
        </div>
      )}

      <TablePrintLayout
        tables={tablesToPrint}
        storeName={storeName}
        layoutMode={printLayout}
      />

      {/* DIALOGS */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Meja" : "Tambah Meja Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">
                Nomor
              </label>
              <Input
                placeholder="Contoh: Meja 12"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 h-11"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Area</label>
              <div className="flex gap-2 flex-wrap">
                {["Indoor", "Outdoor", "Lesehan", "VIP"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setTableSection(s)}
                    className={`px-4 py-2 text-xs rounded-lg border transition-all ${tableSection === s ? "bg-orange-600 border-orange-600 text-white shadow-lg" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveTable}
              disabled={!tableName || isSubmitting}
              className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-11 rounded-xl"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[320px] rounded-3xl p-6">
          <DialogHeader className="flex flex-col items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/20">
              <Sparkles
                size={28}
                className="text-orange-500 fill-orange-500/20"
              />
            </div>
            <div className="text-center">
              <DialogTitle className="text-xl font-bold">
                Closing Toko?
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Status semua meja akan menjadi <b>KOSONG</b>.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex gap-3 w-full mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsResetModalOpen(false)}
              className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-900 h-11 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleResetAllConfirm}
              disabled={isSubmitting}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white h-11 rounded-xl shadow-lg font-bold"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Ya, Reset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-[300px] rounded-3xl p-6">
          <DialogHeader className="flex flex-col items-center gap-2 mb-2">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <DialogTitle className="text-center text-lg">
              Hapus {deleteTableName}?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-zinc-500">
              QR Code meja ini tidak akan bisa digunakan lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 w-full mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="flex-1 bg-transparent border-zinc-700 hover:bg-zinc-900 h-9 text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-9 text-xs border-0 rounded-xl"
            >
              {isDeleting ? (
                <Loader2 className="animate-spin h-3 w-3" />
              ) : (
                "Ya, Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
