"use client";

import { useEffect, useMemo, useState, useRef, type CSSProperties, type SyntheticEvent } from "react";
import Link from "next/link";
import { createFallbackProductImage, getCatalogImageSource } from "@/lib/products/fallback-image";
export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number | null;
  inventorySyncPending?: boolean;
  image: string;
  hoverImage?: string;
  note: string;
  color: string;
  slug?: string;
  variants?: Array<{
    id: string;
    variantName: string;
    sellingPrice: number;
    mrp: number;
    sku: string;
  }>;
};

function handleProductImageError(event: SyntheticEvent<HTMLImageElement>, product: Product) {
  const image = event.currentTarget;
  if (image.src.startsWith("data:image/svg+xml")) return;
  image.src = createFallbackProductImage(product);
}

type Cart = Record<string, number>;
type Transition = "cover" | "reveal" | null;
type StoreTheme = "market" | "ink" | "night";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [orderMode, setOrderMode] = useState<"pickup" | "delivery">("delivery");
  const [cart, setCart] = useState<Cart>({});
  const [bagOpen, setBagOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [transition, setTransition] = useState<Transition>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<StoreTheme>("market");
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Live Supabase Catalog State
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [totalFinds, setTotalFinds] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cache of all loaded products so cart items never get lost when switching category
  const [knownProducts, setKnownProducts] = useState<Map<string, Product>>(() => new Map());

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  // 1. Restore shopping bag from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("tfs_cart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (parsed && typeof parsed === "object") {
          setCart(parsed);
        }
      }
    } catch {}
    setCartLoaded(true);
  }, []);

  // 2. Persist shopping bag to localStorage
  useEffect(() => {
    if (!cartLoaded) return;
    try {
      localStorage.setItem("tfs_cart", JSON.stringify(cart));
    } catch {}
  }, [cart, cartLoaded]);

  // 3. Auto-open bag if customer returns after login
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("checkout") === "1" || window.location.hash === "#bag") {
        setBagOpen(true);
      }
    }
  }, []);

  // 4. Fetch session user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // 5. Fetch real products from Supabase API with search & category filtering
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setLoadingProducts(true);
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "48");
      if (activeCategory !== "all") params.set("category", activeCategory);
      if (query.trim()) params.set("search", query.trim());

      fetch(`/api/products?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.products)) {
            setCatalog(data.products);
            setTotalFinds(data.total || data.products.length);
            setCategories(data.categories || []);
            setPage(1);
            setHasMore(data.page < data.totalPages);
            setFetchError(null);

            // Register into product cache
            setKnownProducts((prev) => {
              const updated = new Map(prev);
              for (const p of data.products) updated.set(p.id, p);
              return updated;
            });
          } else {
            // Never fall back to mock catalog
            setCatalog([]);
            setTotalFinds(0);
            setFetchError("No products found on the shelves.");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch live products from Supabase:", err);
          // Never fall back to mock catalog on error
          setCatalog([]);
          setTotalFinds(0);
          setFetchError("Unable to connect to the store catalog. Please check your connection.");
        })
        .finally(() => {
          setLoadingProducts(false);
        });
    }, 250);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [activeCategory, query]);

  // Load next page of products
  function loadMoreProducts() {
    const nextPage = page + 1;
    const params = new URLSearchParams();
    params.set("page", nextPage.toString());
    params.set("limit", "48");
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (query.trim()) params.set("search", query.trim());

    fetch(`/api/products?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          setCatalog((prev) => [...prev, ...data.products]);
          setPage(nextPage);
          setHasMore(data.page < data.totalPages);

          setKnownProducts((prev) => {
            const updated = new Map(prev);
            for (const p of data.products) updated.set(p.id, p);
            return updated;
          });
        }
      })
      .catch((err) => console.error("Failed to load more products:", err));
  }

  // Cart calculations using knownProducts cache
  const count = useMemo(() => {
    return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  }, [cart]);

  const cartProducts = useMemo(() => {
    return Object.keys(cart)
      .map((id) => knownProducts.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [cart, knownProducts]);

  const total = useMemo(() => {
    return cartProducts.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0);
  }, [cartProducts, cart]);

  function navigate(action: () => void) {
    if (transition) return;
    setTransition("cover");
    window.setTimeout(() => {
      action();
      window.scrollTo(0, 0);
      setTransition("reveal");
      window.setTimeout(() => setTransition(null), 780);
    }, 700);
  }

  function add(product: Product) {
    if (!product || product.price <= 0) {
      notify("Item unpriced. Cannot add to bag.");
      return;
    }
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
    setToast(`${product.name} added to your bag`);
    window.setTimeout(() => setToast(""), 1800);
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[id] ?? 0) + delta;
      if (quantity <= 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  }

  function showBag() {
    navigate(() => {
      setBagOpen(true);
      setSelectedProduct(null);
    });
  }

  function showShop() {
    navigate(() => {
      setBagOpen(false);
      setSelectedProduct(null);
    });
  }

  function showProduct(product: Product) {
    navigate(() => {
      setSelectedProduct(product);
      setBagOpen(false);
    });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      notify("Signed out successfully");
    } catch {
      notify("Error signing out");
    }
  }

  function handleCheckout() {
    if (!currentUser) {
      notify("Please sign in to proceed with checkout");
      window.setTimeout(() => {
        window.location.href = "/login?redirect=" + encodeURIComponent("/?checkout=1");
      }, 700);
      return;
    }
    notify(`Hi ${currentUser.name.split(" ")[0]}! Checkout integration coming next.`);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-identity">
          <button className="brand-mark" onClick={showShop} aria-label="The Family Store home">
            <img className="brand-logo" src="/family-store-logo.png" alt="" />
          </button>
          <div className="brand-social">
            <span>FOLLOW US ON INSTAGRAM</span>
            <a className="social-handle" href="https://www.instagram.com/the_family_store_lekhi_village/" target="_blank" rel="noreferrer">
              @the_family_store_lekhi_village
            </a>
          </div>
        </div>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button className={`nav-link ${!bagOpen ? "active" : ""}`} onClick={showShop}>Shop</button>
          <button className={`nav-link ${bagOpen ? "active" : ""}`} onClick={showBag}>Bag ({count})</button>

          {currentUser?.role === "ADMIN" && (
            <Link className="nav-link" href="/admin" title="Admin dashboard">
              Admin ↗
            </Link>
          )}

          {currentUser ? (
            <div className="user-nav-badge">
              <Link className="user-nav-name" href="/account" title="View customer profile">
                Hi, {currentUser.name.split(" ")[0]} ↗
              </Link>
              <button className="user-nav-logout" onClick={handleLogout} title="Log out of your account">
                Logout
              </button>
            </div>
          ) : (
            <div className="nav-auth-cluster" role="group" aria-label="Customer account">
              <Link className="nav-auth-btn" href="/login">Sign In</Link>
              <Link className="nav-auth-btn nav-auth-btn-solid" href="/register">Sign Up <i>↗</i></Link>
            </div>
          )}

          <div className="theme-switch" role="group" aria-label="Choose a color theme">
            <button className={`theme-swatch swatch-ink ${theme === "ink" ? "selected" : ""}`} aria-label="Black on cream theme" aria-pressed={theme === "ink"} onClick={() => setTheme("ink")} />
            <button className={`theme-swatch swatch-market ${theme === "market" ? "selected" : ""}`} aria-label="Red on cream theme" aria-pressed={theme === "market"} onClick={() => setTheme("market")} />
            <button className={`theme-swatch swatch-night ${theme === "night" ? "selected" : ""}`} aria-label="Cream on black theme" aria-pressed={theme === "night"} onClick={() => setTheme("night")} />
          </div>
        </nav>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close" : "Menu"}</button>
      </header>

      {menuOpen && (
        <div className="mobile-menu-panel">
          <button onClick={() => { showShop(); setMenuOpen(false); }}>Shop</button>
          <button onClick={() => { showBag(); setMenuOpen(false); }}>Bag ({count})</button>
          {currentUser?.role === "ADMIN" && (
            <Link className="mobile-auth-link" href="/admin" onClick={() => setMenuOpen(false)}>
              Admin Dashboard <span>↗</span>
            </Link>
          )}
          {currentUser ? (
            <div className="mobile-menu-auth-group">
              <Link className="mobile-auth-link" href="/account" onClick={() => setMenuOpen(false)}>
                My Account ({currentUser.name.split(" ")[0]}) <span>↗</span>
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }}>Logout</button>
            </div>
          ) : (
            <div className="mobile-menu-auth-group">
              <Link className="mobile-auth-link" href="/login" onClick={() => setMenuOpen(false)}>Sign In <span>→</span></Link>
              <Link className="mobile-auth-link" href="/register" onClick={() => setMenuOpen(false)}>Sign Up <span>↗</span></Link>
            </div>
          )}
          <div className="theme-switch mobile-theme-switch" role="group" aria-label="Choose a color theme">
            <button className={`theme-swatch swatch-ink ${theme === "ink" ? "selected" : ""}`} aria-label="Black on cream theme" aria-pressed={theme === "ink"} onClick={() => setTheme("ink")} />
            <button className={`theme-swatch swatch-market ${theme === "market" ? "selected" : ""}`} aria-label="Red on cream theme" aria-pressed={theme === "market"} onClick={() => setTheme("market")} />
            <button className={`theme-swatch swatch-night ${theme === "night" ? "selected" : ""}`} aria-label="Cream on black theme" aria-pressed={theme === "night"} onClick={() => setTheme("night")} />
          </div>
        </div>
      )}

      {bagOpen ? (
        <section className="bag-page">
          <div className="giant-title-wrap"><h1 className="giant-title">YOUR BAG</h1></div>
          <div className="hero-rule" />
          {cartProducts.length ? (
            <>
              <div className="bag-page-list">
                {cartProducts.map((product) => (
                  <article className="bag-page-row" key={product.id}>
                    <div className="bag-page-name">
                      <h2>{product.name}</h2>
                      <span>₹{product.price}</span>
                    </div>
                    <button className="bag-delete" onClick={() => changeQuantity(product.id, -cart[product.id])}>Delete</button>
                    <img
                      src={getCatalogImageSource(product)}
                      alt={product.name}
                      onError={(event) => handleProductImageError(event, product)}
                    />
                    <div className="bag-page-quantity">
                      <button onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`}>−</button>
                      <span>{cart[product.id]}</span>
                      <button onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}>+</button>
                    </div>
                    <div className="bag-row-rule" />
                  </article>
                ))}
              </div>
              <div className="bag-page-footer">
                <div><span>SUBTOTAL</span><strong>₹{total.toFixed(2)}</strong></div>
                <p>Store prices verified directly with RanceLab inventory.</p>
                <button onClick={handleCheckout}>CHECKOUT <span>↗</span></button>
              </div>
            </>
          ) : (
            <div className="bag-page-empty">
              <p>Nothing in here just yet.</p>
              <button onClick={showShop}>BACK TO THE SHELVES ↗</button>
            </div>
          )}
        </section>
      ) : selectedProduct ? (
        <section className="product-page">
          <button className="return-link" onClick={showShop}>← RETURN TO SHOP</button>
          <div className="product-detail-grid">
            <div className="product-detail-photos">
              <div className="detail-photo">
                <img
                  src={getCatalogImageSource(selectedProduct)}
                  alt={selectedProduct.name}
                  onError={(event) => handleProductImageError(event, selectedProduct)}
                />
              </div>
              <div className="detail-photo detail-photo-zoom">
                <img
                  src={getCatalogImageSource(selectedProduct)}
                  alt={`${selectedProduct.name}, close-up`}
                  onError={(event) => handleProductImageError(event, selectedProduct)}
                />
              </div>
            </div>
            <div className="product-detail-copy">
              <span className="eyebrow">{selectedProduct.category} · IN THE STORE</span>
              <h1>{selectedProduct.name}</h1>
              <strong>₹{selectedProduct.price}</strong>
              <p>{selectedProduct.note}. Stocked fresh at The Family Store.</p>

              {selectedProduct.variants && selectedProduct.variants.length > 1 && (
                <div style={{ margin: "20px 0" }}>
                  <span className="eyebrow" style={{ display: "block", marginBottom: "8px" }}>Available Batches / Options</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {selectedProduct.variants.map((v) => (
                      <span
                        key={v.id}
                        className="category-chip"
                        style={{ fontSize: "11px", padding: "6px 12px" }}
                      >
                        {v.variantName} · ₹{v.sellingPrice}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-stock">PHYSICAL INVENTORY PENDING SYNC (RANCELAB FR6)</div>
              <button
                className="detail-add"
                onClick={() => add(selectedProduct)}
                disabled={selectedProduct.price <= 0}
              >
                ADD TO BAG <span>↗</span>
              </button>
              <button className="detail-back" onClick={showShop}>KEEP LOOKING</button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="hero" id="home">
            <div className="hero-word-wrap">
              <h1 className="hero-word family-wordmark">THE FAMILY STORE</h1>
            </div>
            <div className="hero-rule" />
            <div className="hero-details">
              <span className="eyebrow">THE FAMILY STORE</span>
              <div className="hero-copy">
                <span className="eyebrow">GOOD THINGS, CLOSE TO HOME</span>
                <p>Your everyday little wins, all under one roof. From pantry favourites to the things you forgot you needed.</p>
              </div>
              <button className="hero-link" onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}>
                COME ON IN <span>↘</span>
              </button>
              <span className="copyright">© 2026</span>
            </div>
            <div className="order-fulfillment">
              <span className="eyebrow">HOW WOULD YOU LIKE IT?</span>
              <div className="order-mode-switch" role="group" aria-label="Choose pickup or delivery">
                <button className={orderMode === "pickup" ? "selected" : ""} aria-pressed={orderMode === "pickup"} onClick={() => setOrderMode("pickup")}>Order Pickup</button>
                <button className={orderMode === "delivery" ? "selected" : ""} aria-pressed={orderMode === "delivery"} onClick={() => setOrderMode("delivery")}>Order Delivery</button>
              </div>
            </div>
          </section>

          <section className="shop" id="shop">
            <div className="shop-heading">
              <span className="eyebrow shelf-eyebrow">ON THE SHELVES</span>
              <div className="shop-controls">
                <label className="search-box">
                  <span aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="10.8" cy="10.8" r="6.8" />
                      <path d="m16 16 5 5" />
                    </svg>
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search 2,000+ items..."
                    aria-label="Search products"
                  />
                  {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
                </label>
                <span className="product-count">
                  {totalFinds.toString().padStart(2, "0")} FINDS
                </span>
              </div>
            </div>

            {/* Category Shelf Filter Pills */}
            {categories.length > 0 && (
              <div className="category-row" role="tablist" aria-label="Product categories">
                <button
                  role="tab"
                  aria-selected={activeCategory === "all"}
                  className={`category-chip ${activeCategory === "all" ? "selected" : ""}`}
                  onClick={() => setActiveCategory("all")}
                >
                  All Items <span>{totalFinds}</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={activeCategory === cat.slug}
                    className={`category-chip ${activeCategory === cat.slug ? "selected" : ""}`}
                    onClick={() => setActiveCategory(cat.slug)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {loadingProducts && catalog.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <p className="eyebrow">LOADING STORE SHELVES...</p>
              </div>
            ) : catalog.length ? (
              <>
                <div className="product-grid">
                  {catalog.map((product, index) => (
                    <article
                      className={`product-card mosaic-card mosaic-${index % 8}`}
                      key={product.id}
                      onClick={() => showProduct(product)}
                      onKeyDown={(event) => { if (event.key === "Enter") showProduct(product); }}
                      role="button"
                      tabIndex={0}
                      style={{ "--card-bg": product.color, "--delay": `${Math.min(index, 12) * 55}ms` } as CSSProperties & { "--card-bg": string; "--delay": string }}
                    >
                      <div className="product-image-wrap">
                        <img
                          src={getCatalogImageSource(product)}
                          alt={product.name}
                          className="product-image"
                          loading={index > 3 ? "lazy" : "eager"}
                          onError={(event) => handleProductImageError(event, product)}
                        />
                        {product.hoverImage && (
                          <img
                            src={getCatalogImageSource({ ...product, image: product.hoverImage })}
                            alt=""
                            className="product-image product-image-alt"
                            loading="lazy"
                            onError={(event) => handleProductImageError(event, product)}
                          />
                        )}
                        <span className="stock-tag">IN STORE</span>
                        <span className="view-more">VIEW<br />MORE <i>↗</i></span>
                        {cart[product.id] ? (
                          <div className="card-quantity" onClick={(event) => event.stopPropagation()}>
                            <button onKeyDown={(event) => event.stopPropagation()} onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`}>−</button>
                            <span aria-live="polite">{cart[product.id]}</span>
                            <button onKeyDown={(event) => event.stopPropagation()} onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}>+</button>
                          </div>
                        ) : (
                          <button
                            className="add-button"
                            onKeyDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              add(product);
                            }}
                            aria-label={`Add ${product.name} to bag`}
                          >
                            +
                          </button>
                        )}
                      </div>
                      <div className="product-info">
                        <div>
                          <span className="product-category">{product.category}</span>
                          <h3>{product.name}</h3>
                        </div>
                        <span className="product-price">₹{product.price}</span>
                      </div>
                    </article>
                  ))}
                </div>

                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: "60px" }}>
                    <button
                      className="category-chip"
                      style={{ padding: "14px 28px", fontSize: "12px", cursor: "pointer", background: "var(--ink)", color: "var(--paper)" }}
                      onClick={loadMoreProducts}
                    >
                      LOAD MORE ITEMS ({catalog.length} of {totalFinds}) ↘
                    </button>
                  </div>
                )}
              </>
            ) : fetchError ? (
              <div className="empty-results">
                <span>CATALOG NOTICE</span>
                <p>{fetchError}</p>
                <button onClick={() => { setActiveCategory("all"); setQuery(""); }}>Refresh Shelves ↗</button>
              </div>
            ) : (
              <div className="empty-results">
                <span>NOT FOUND (YET)</span>
                <p>Try another search or explore a different shelf category.</p>
                <button onClick={() => { setQuery(""); setActiveCategory("all"); }}>Show me everything ↗</button>
              </div>
            )}

            <div className="shelf-note">
              <span>THAT'S THE SHELF FOR NOW</span>
              <p>Over 2,000 real store items synchronized directly from RanceLab ERP.</p>
              <span>↘</span>
            </div>
          </section>

          <footer className="footer">
            <div className="footer-rule" />
            <div className="footer-promise">
              <h2>Groceries at your door.<br />In 45 minutes.</h2>
              <span>©26</span>
            </div>
            <p className="footer-summary">Everyday essentials, little treats, and last-minute saves — delivered before you know it.</p>
            <div className="footer-rule" />
            <div className="footer-grid">
              <div className="footer-brand-lockup">
                <img className="footer-brand-logo" src="/family-store-logo.png" alt="The Family Store" />
                <span>THE FAMILY STORE<br />EVERYDAY, EST. ALWAYS</span>
              </div>
              <div>
                <span className="eyebrow">A LITTLE ABOUT US</span>
                <p>Stocked with the familiar, the useful, and the little treats that make the day.</p>
              </div>
              <div className="footer-links">
                <a href="#shop">SHOP THE SHELVES</a>
                <a href="/shipping-and-returns">SHIPPING &amp; RETURNS ↗</a>
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>BACK TO TOP ↑</button>
              </div>
              <span className="copyright">© 2026</span>
            </div>
          </footer>
        </>
      )}

      {count > 0 && (
        <div className="mobile-checkout-bar">
          <div>
            <span>{count} {count === 1 ? "ITEM" : "ITEMS"} IN YOUR BAG</span>
            <strong>₹{total.toFixed(2)}</strong>
          </div>
          <button onClick={() => (bagOpen ? handleCheckout() : showBag())}>
            CHECKOUT <span>↗</span>
          </button>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}<span>✓</span></div>}
      {transition && (
        <div className={`red-curtain ${transition}`} aria-hidden="true">
          <img src="/family-store-logo.png" alt="" />
        </div>
      )}
    </main>
  );
}
