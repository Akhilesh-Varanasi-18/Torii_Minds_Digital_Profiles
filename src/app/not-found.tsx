import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
        <p className="font-mono text-6xl font-extrabold gradient-text">404</p>
        <h1 className="mt-4 text-2xl font-bold">Portfolio not found</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          No portfolio exists for that employee code yet. You can create one from
          the home page.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
