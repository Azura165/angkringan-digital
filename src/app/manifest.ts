import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Angkringan Mas Radit",
    short_name: "Angkringan",
    description: "SaaS Angkringan Modern",
    start_url: "/",
    display: "standalone", // INI KUNCINYA: Hilangkan UI Browser
    background_color: "#09090b", // Zinc-950
    theme_color: "#09090b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
