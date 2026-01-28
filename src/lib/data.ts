// DATABASE SEMENTARA (Simulasi API)

export const CATEGORIES = [
  { id: "all", name: "🔥 Semua" },
  { id: "sate", name: "🍡 Sate" },
  { id: "nasi", name: "🍚 Nasi" },
  { id: "minum", name: "🍹 Minuman" },
  { id: "gorengan", name: "🥟 Gorengan" },
];

export const MENU_ITEMS = [
  {
    id: "1",
    name: "Sate Kulit Bakar",
    description: "Bumbu kecap manis pedas, tekstur kenyal & smoky.",
    price: 3000,
    originalPrice: 4000,
    rating: 4.8,
    category: "sate",
    isRecommended: true,
    // GANTI KE GAMBAR LOKAL:
    image: "/menu/sate-kulit.jpg",
  },
  {
    id: "2",
    name: "Nasi Kucing Teri",
    description: "Sambal teri medan nendang, bungkus daun pisang.",
    price: 5000,
    originalPrice: 0,
    rating: 4.9,
    category: "nasi",
    isRecommended: true,
    // GANTI KE GAMBAR LOKAL:
    image: "/menu/nasi-kucing.jpg",
  },
  {
    id: "3",
    name: "Es Teh Jumbo",
    description: "Teh wangi melati asli, gula batu, segar maksimal.",
    price: 3000,
    originalPrice: 0,
    rating: 4.7,
    category: "minum",
    isRecommended: true,
    // GANTI KE GAMBAR LOKAL:
    image: "/menu/es-teh.jpg",
  },
  // Item dummy lain biarkan saja atau tambahkan gambar lain nanti
  {
    id: "4",
    name: "Sate Usus",
    description: "Digoreng garing lalu dibakar bumbu rempah.",
    price: 3000,
    originalPrice: 0,
    rating: 4.6,
    category: "sate",
    isRecommended: false,
    image:
      "https://asset.kompas.com/crops/Oqe7u9QUkCgmeN5eO6WUbd3GDYk=/0x0:1000x667/750x500/data/photo/2020/10/23/5f92bf44d1872.jpg",
  },
  {
    id: "5",
    name: "Wedang Jahe",
    description: "Jahe merah asli, gula aren, hangat di badan.",
    price: 5000,
    originalPrice: 0,
    rating: 4.9,
    category: "minum",
    isRecommended: false,
    image:
      "https://asset.kompas.com/crops/Oqe7u9QUkCgmeN5eO6WUbd3GDYk=/0x0:1000x667/750x500/data/photo/2020/10/23/5f92bf44d1872.jpg",
  },
];

// ... (Bagian STORY_CONTENT biarkan sama dulu)
export const STORY_CONTENT = {
  // ...
  title: "Dari Gerobak ke Digital",
  subtitle: "Perjalanan Rasa Angkringan Mas Radit",
  description:
    "Berawal dari kecintaan pada kuliner malam Jogja, Mas Radit memulai usaha ini di tahun 2023 dengan satu misi: Menyajikan kehangatan angkringan otentik dengan sentuhan modern.",
  stats: [
    { label: "Cabang", value: "3" },
    { label: "Pelanggan", value: "10k+" },
    { label: "Menu", value: "50+" },
  ],
  gallery: [
    "/menu/sate-kulit.jpg", // Bisa pakai gambar sate juga buat gallery
    "https://asset.kompas.com/crops/Oqe7u9QUkCgmeN5eO6WUbd3GDYk=/0x0:1000x667/750x500/data/photo/2020/10/23/5f92bf44d1872.jpg",
  ],
};
