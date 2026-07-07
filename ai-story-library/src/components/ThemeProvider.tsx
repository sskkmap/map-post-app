"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // パスからジャンルを推測 (例: /mystery/xxx -> mystery)
    const genre = pathname.split("/")[1];

    const validThemes = ["mystery", "trip", "smile", "emotion", "life", "knowledge"];
    const theme = validThemes.includes(genre) ? genre : "portal";

    // html要素のdata-theme属性を更新
    document.documentElement.setAttribute("data-theme", theme);
  }, [pathname]);

  return <>{children}</>;
}
