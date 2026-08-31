"use client";

import Image from "next/image";
import { ORGS } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

/** Renders the active org's logo, swapping the asset per light/dark mode. */
export function Logo({ className = "" }: { className?: string }) {
  const { org, mode } = useTheme();
  const meta = ORGS[org];
  const src = meta.logo[mode];

  return (
    <div className={`flex items-center ${className}`} aria-label={meta.name}>
      <Image
        key={src}
        src={src}
        alt={`${meta.name} logo`}
        width={meta.logoWidth}
        height={64}
        priority
        className="h-9 w-auto object-contain sm:h-10"
        style={{ maxWidth: meta.logoWidth }}
      />
    </div>
  );
}
