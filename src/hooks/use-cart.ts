import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

export interface CartItem extends MenuItem {
  qty: number;
}

// TIPE DATA BARU UNTUK RIWAYAT
export interface OrderHistory {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  customerName: string;
  tableNumber: string;
}

interface CartStore {
  items: CartItem[];
  history: OrderHistory[]; // <-- Data Riwayat
  isConfirmed: boolean;

  addToCart: (product: MenuItem) => void;
  removeFromCart: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setConfirmed: (status: boolean) => void;

  moveToHistory: (name: string, table: string) => void; // <-- Fungsi Pindah ke History
  clearHistory: () => void;

  totalItems: () => number;
  totalPrice: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      history: [], // Awalnya kosong
      isConfirmed: false,

      addToCart: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (item) => item.id === product.id,
        );

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
            ),
            isConfirmed: false,
          });
        } else {
          set({
            items: [...currentItems, { ...product, qty: 1 }],
            isConfirmed: false,
          });
        }
      },

      removeFromCart: (productId) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === productId);

        if (existingItem && existingItem.qty > 1) {
          set({
            items: currentItems.map((item) =>
              item.id === productId ? { ...item, qty: item.qty - 1 } : item,
            ),
          });
        } else {
          set({
            items: currentItems.filter((item) => item.id !== productId),
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.id !== productId),
        });
      },

      clearCart: () => set({ items: [], isConfirmed: false }),
      setConfirmed: (status) => set({ isConfirmed: status }),

      // --- LOGIC PINDAH KE HISTORY (BARU) ---
      moveToHistory: (name, table) => {
        const currentItems = get().items;
        if (currentItems.length === 0) return;

        const total = get().items.reduce(
          (acc, item) => acc + item.price * item.qty,
          0,
        );

        const newOrder: OrderHistory = {
          id: `ORD-${Date.now().toString().slice(-6)}`, // ID Unik pendek
          date: new Date().toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          items: [...currentItems],
          total: total,
          customerName: name,
          tableNumber: table,
        };

        set((state) => ({
          history: [newOrder, ...state.history], // Tambah ke paling atas (terbaru)
          items: [], // Kosongkan keranjang
          isConfirmed: false, // Reset status
        }));
      },

      clearHistory: () => set({ history: [] }),

      totalItems: () =>
        get().items.reduce((total, item) => total + item.qty, 0),
      totalPrice: () =>
        get().items.reduce((total, item) => total + item.price * item.qty, 0),
    }),
    {
      name: "angkringan-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
