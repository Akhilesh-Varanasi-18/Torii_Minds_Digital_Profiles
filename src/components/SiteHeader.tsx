"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { DownloadMenu } from "./DownloadMenu";

export function SiteHeader({ showLogoLink = true, portfolioCode }: { showLogoLink?: boolean; portfolioCode?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: "rgb(var(--shadow-color) / 0.02)", borderColor: "var(--line)", backgroundColor: "color-mix(in srgb, var(--bg) 82%, transparent)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {showLogoLink ? (
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
        ) : (
          <Logo />
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          {portfolioCode && <DownloadMenu code={portfolioCode} />}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
