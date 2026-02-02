"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  Search,
  Loader2,
  UserCircle,
  KeyRound,
  BadgeCheck,
  Activity,
  Clock,
  Pencil,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// --- CONFIG ---
const CACHE_KEY_USERS = "admin_users_data_v3";

// --- HELPERS ---
const timeAgo = (dateString: string | null) => {
  if (!dateString) return "Offline";
  const diff = Math.floor(
    (new Date().getTime() - new Date(dateString).getTime()) / 1000,
  );
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(dateString).toLocaleDateString("id-ID");
};

const isUserOnline = (dateString: string | null) => {
  if (!dateString) return false;
  return new Date().getTime() - new Date(dateString).getTime() < 5 * 60 * 1000;
};

// --- SUB-COMPONENT: USER CARD ---
const UserCard = memo(
  ({
    user,
    onDelete,
    onEdit,
  }: {
    user: any;
    onDelete: (u: any) => void;
    onEdit: (u: any) => void;
  }) => {
    const online = isUserOnline(user.last_seen);
    const isOwner = user.role === "super_admin";

    return (
      <div className="bg-zinc-900/40 border border-white/5 p-5 rounded-3xl flex flex-col justify-between group hover:border-zinc-700 hover:bg-zinc-900/60 transition-all relative overflow-hidden active:scale-[0.99] duration-200 shadow-sm">
        {/* Status Indicator */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          {online ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 animate-in fade-in zoom-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide">
                Online
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded-full border border-white/5">
              <div className="h-2 w-2 rounded-full bg-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
                Offline
              </span>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg ${isOwner ? "bg-gradient-to-br from-purple-600 to-purple-800 text-white" : "bg-gradient-to-br from-blue-600 to-blue-800 text-white"}`}
          >
            {user.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight line-clamp-1">
              {user.full_name}
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              @{user.username}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 text-[10px] uppercase tracking-wider ${isOwner ? "text-purple-400 border-purple-500/30" : "text-blue-400 border-blue-500/30"}`}
            >
              {isOwner ? "Owner" : "Kasir"}
            </Badge>
          </div>
        </div>

        {/* Footer Stats & Actions */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
            {online ? (
              <Activity size={12} className="text-emerald-500" />
            ) : (
              <Clock size={12} />
            )}
            {online ? "Sedang aktif" : `Aktif: ${timeAgo(user.last_seen)}`}
          </div>

          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(user)}
              className="h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Pencil size={14} />
            </Button>
            {!isOwner && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDelete(user)}
                className="h-8 w-8 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  },
);
UserCard.displayName = "UserCard";

// --- MAIN PAGE ---
export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<
    "all" | "cashier" | "super_admin"
  >("all");

  // Form Modal State (Add & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "cashier",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // 1. FETCH USERS
  const fetchUsers = useCallback(async (useCache = true) => {
    if (useCache) {
      const cached = sessionStorage.getItem(CACHE_KEY_USERS);
      if (cached) {
        setUsers(JSON.parse(cached));
        setIsLoading(false);
      }
    }
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
      sessionStorage.setItem(CACHE_KEY_USERS, JSON.stringify(data));
    } catch (e) {
      if (!useCache) toast.error("Gagal sinkronisasi data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. REALTIME LISTENER
  useEffect(() => {
    fetchUsers(true);
    const channel = supabase
      .channel("admin-users-realtime-v3")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admins" },
        () => fetchUsers(false),
      )
      .subscribe();
    const interval = setInterval(() => setUsers((prev) => [...prev]), 60000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchUsers]);

  // 3. HANDLERS (CRUD)
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ full_name: "", username: "", password: "", role: "cashier" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = useCallback((user: any) => {
    setIsEditMode(true);
    setSelectedUserId(user.id);
    // Kosongkan password agar tidak terekspos (isi hanya jika mau reset)
    setFormData({
      full_name: user.full_name,
      username: user.username,
      password: "",
      role: user.role,
    });
    setIsModalOpen(true);
  }, []);

  const handleSubmit = async () => {
    if (!formData.username || !formData.full_name) {
      toast.error("Nama & Username wajib diisi!");
      return;
    }
    if (!isEditMode && !formData.password) {
      toast.error("Password wajib diisi untuk user baru!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && selectedUserId) {
        // Logic Edit (Password opsional)
        const updatePayload: any = {
          full_name: formData.full_name,
          username: formData.username,
          role: formData.role,
        };
        if (formData.password) updatePayload.password = formData.password; // Hanya update jika diisi

        const { error } = await supabase
          .from("admins")
          .update(updatePayload)
          .eq("id", selectedUserId);
        if (error) throw error;
        toast.success("Data staff diperbarui ✅");
      } else {
        // Logic Add
        const { error } = await supabase
          .from("admins")
          .insert([{ ...formData, last_seen: null }]);
        if (error) throw error;
        toast.success("Staff baru ditambahkan ✅");
      }
      setIsModalOpen(false);
      fetchUsers(false);
    } catch (e: any) {
      toast.error(
        isEditMode
          ? "Gagal update."
          : "Gagal tambah. Username mungkin duplikat.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      const { error } = await supabase
        .from("admins")
        .delete()
        .eq("id", userToDelete.id);
      if (error) throw error;
      toast.success("Staff dihapus 👋");
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  // 4. FILTERING
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/80 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-xl sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Users size={28} className="text-blue-500" /> Tim & Akses
          </h1>
          <p className="text-zinc-400 text-xs mt-1 ml-1 font-medium">
            Pantau aktivitas kasir dan kelola akun.
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 rounded-xl h-10 px-6 w-full md:w-auto active:scale-95 transition-transform"
        >
          <Plus size={18} className="mr-2" /> Tambah Staff
        </Button>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
          <Input
            placeholder="Cari nama / username..."
            className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl text-sm h-10 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start overflow-x-auto scrollbar-hide">
          {[
            { id: "all", label: "Semua" },
            { id: "cashier", label: "Kasir" },
            { id: "super_admin", label: "Owner" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterRole(f.id as any)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filterRole === f.id ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID USERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && users.length === 0 ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-zinc-900/50 rounded-3xl animate-pulse border border-white/5"
            />
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full py-20 text-center text-zinc-500 flex flex-col items-center">
            <Users size={48} className="opacity-20 mb-3" />
            <p>Tidak ada staff yang ditemukan.</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onDelete={setUserToDelete}
              onEdit={handleOpenEdit}
            />
          ))
        )}
      </div>

      {/* MODAL FORM (ADD/EDIT) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Staff" : "Tambah Staff Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserCircle
                  className="absolute left-3 top-3 text-zinc-500"
                  size={16}
                />
                <Input
                  placeholder="Nama Lengkap"
                  className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Username
                </label>
                <div className="relative">
                  <Shield
                    className="absolute left-3 top-3 text-zinc-500"
                    size={16}
                  />
                  <Input
                    placeholder="username"
                    className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase">
                  Password {isEditMode && "(Opsional)"}
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-3 text-zinc-500"
                    size={16}
                  />
                  <Input
                    type="text"
                    placeholder={isEditMode ? "Isi untuk reset" : "***"}
                    className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase">
                Posisi
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData({ ...formData, role: "cashier" })}
                  className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${formData.role === "cashier" ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"}`}
                >
                  <BadgeCheck size={18} />
                  <span className="text-xs font-bold">Kasir</span>
                </button>
                <button
                  onClick={() =>
                    setFormData({ ...formData, role: "super_admin" })
                  }
                  className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${formData.role === "super_admin" ? "bg-purple-500/10 border-purple-500 text-purple-500" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"}`}
                >
                  <Shield size={18} />
                  <span className="text-xs font-bold">Owner</span>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="text-zinc-400"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-zinc-200 font-bold rounded-xl"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                "Simpan Data"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRM DELETE (New Modern UI) */}
      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[400px] rounded-3xl p-0 overflow-hidden">
          <div className="bg-red-500/10 p-6 flex flex-col items-center justify-center text-center border-b border-red-500/20">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500 animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <DialogTitle className="text-xl font-bold text-red-500">
              Hapus Akses?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2 text-xs max-w-[280px]">
              Anda yakin ingin menghapus <b>{userToDelete?.full_name}</b>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </div>
          <DialogFooter className="p-4 bg-zinc-900 flex gap-2 justify-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => setUserToDelete(null)}
              className="flex-1 text-zinc-400 hover:text-white rounded-xl h-11"
            >
              Batalkan
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl h-11 shadow-lg shadow-red-900/20"
            >
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
