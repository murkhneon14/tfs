import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=" + encodeURIComponent("/admin"));
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="admin-access-denied">
        <div className="admin-denied-card">
          <span className="eyebrow">RESTRICTED ACCESS</span>
          <h1>403 — FORBIDDEN</h1>
          <p>
            You are signed in as <strong>{user.email}</strong>, which does not have administrator privileges.
          </p>
          <div className="admin-denied-actions">
            <Link href="/" className="admin-btn admin-btn-solid">
              ← Return to Storefront
            </Link>
            <Link href="/account" className="admin-btn">
              Customer Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <Link href="/admin" className="brand-mark" aria-label="Admin Dashboard">
            <img className="brand-logo" src="/family-store-logo.png" alt="The Family Store" />
          </Link>
          <div className="admin-brand-tag">
            <span className="admin-pill">ADMIN CONSOLE</span>
            <span className="admin-site-name">The Family Store</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          <Link href="/admin" className="admin-nav-link">
            Dashboard
          </Link>
          <Link href="/admin/products" className="admin-nav-link">
            Products
          </Link>
          <Link href="/admin/categories" className="admin-nav-link">
            Categories
          </Link>
        </nav>

        <div className="admin-user-cluster">
          <Link href="/" className="admin-view-store" title="Open customer storefront in new tab" target="_blank">
            View Store ↗
          </Link>
          <div className="admin-user-badge">
            <span className="admin-user-name">Admin: {user.name.split(" ")[0]}</span>
            <a href="/api/auth/logout" className="admin-logout-btn" title="Sign out of admin session">
              Logout
            </a>
          </div>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
