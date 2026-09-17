"use client";

import { useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { defaultLocale, resolveLocale, textDirections } from "../i18n/translations";

export function DirectionSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    const locale = resolveLocale(searchParams.get("lang") ?? defaultLocale);
    document.documentElement.lang = locale;
    document.documentElement.dir = textDirections[locale];
  }, [pathname, searchParams]);

  return null;
}
