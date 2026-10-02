import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TENDA",
    short_name: "TENDA",
    description: "Customer intelligence for Nigerian small businesses.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FFFDFB",
    theme_color: "#E85D04",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
