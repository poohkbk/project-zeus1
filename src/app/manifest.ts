import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "법률사무소 제우",
    short_name: "제우",
    description: "청주 민사, 형사, 이혼, 상속 법률상담",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0F2D52",
    icons: [
      {
        src: "/favicon.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
