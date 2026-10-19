import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="policy-page">
      <header className="topbar policy-topbar">
        <Link className="brand-mark" href="/" aria-label="The Family Store home">
          <img className="brand-logo" src="/family-store-logo.png" alt="The Family Store" />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link className="nav-link" href="/#shop">Shop</Link>
          <a className="nav-link" href="/api/auth/logout">Logout</a>
        </nav>
        <Link className="policy-mobile-shop" href="/#shop">Shop</Link>
      </header>

      <div className="account-container">
        <section className="account-card" aria-labelledby="account-heading">
          <div className="account-header">
            <span className="eyebrow">CUSTOMER PROFILE</span>
            <h1 id="account-heading">{user.name}</h1>
          </div>

          <div className="account-grid">
            <div className="account-item">
              <span>Full Name</span>
              <strong>{user.name}</strong>
            </div>

            <div className="account-item">
              <span>Email Address</span>
              <strong>{user.email}</strong>
            </div>

            <div className="account-item">
              <span>Account Status</span>
              <strong>
                <span className="account-badge">{user.status}</span>
              </strong>
            </div>

            <div className="account-item">
              <span>Account Role</span>
              <strong>
                <span className="account-badge">{user.role}</span>
              </strong>
            </div>

            <div className="account-item">
              <span>Customer Since</span>
              <strong>{memberSince}</strong>
            </div>
          </div>

          <div className="account-actions">
            <Link className="account-back-link" href="/">← Return to Store</Link>
            <a className="account-logout-btn" href="/api/auth/logout">Logout of Store</a>
          </div>
        </section>
      </div>
    </main>
  );
}
