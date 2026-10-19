"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSafeRedirectUrl } from "@/lib/auth/redirect";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      const redirectParam = params.get("redirect");

      if (urlError) {
        setError(urlError);
      }
      if (redirectParam) {
        setRedirectUrl(getSafeRedirectUrl(redirectParam, "/"));
      }
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      // Successful login -> redirect to safe return destination (e.g. checkout or home)
      router.push(redirectUrl);
      router.refresh();
    } catch {
      setError("Unable to connect to the server. Please check your connection.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="topbar policy-topbar">
        <Link className="brand-mark" href="/" aria-label="The Family Store home">
          <img className="brand-logo" src="/family-store-logo.png" alt="The Family Store" />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link className="nav-link" href="/#shop">Shop</Link>
          <Link className="nav-link" href="/register">Register</Link>
        </nav>
        <Link className="policy-mobile-shop" href="/#shop">Shop</Link>
      </header>

      <div className="auth-container">
        <section className="auth-card" aria-labelledby="login-heading">
          <div className="auth-header">
            <span className="eyebrow">CUSTOMER ACCOUNT</span>
            <h1 id="login-heading">SIGN IN</h1>
            <p>Welcome back to The Family Store.</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 18 }}>
              {error}
            </div>
          )}

          <a href={`/api/auth/google${redirectUrl !== "/" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`} className="google-auth-btn" aria-label="Sign in with Google">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google
          </a>

          <div className="auth-divider">or continue with email</div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={loading}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to Store ↗"}
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account yet?
            <Link href={`/register${redirectUrl !== "/" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}>Create an account</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
