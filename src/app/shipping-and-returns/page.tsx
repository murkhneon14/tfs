import Link from "next/link";

export default function ShippingAndReturnsPage() {
  return (
    <main className="policy-page">
      <header className="topbar policy-topbar">
        <Link className="brand-mark" href="/" aria-label="The Family Store home">
          <img className="brand-logo" src="/family-store-logo.png" alt="The Family Store" />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link className="nav-link" href="/#shop">Shop</Link>
        </nav>
        <Link className="policy-mobile-shop" href="/#shop">Shop</Link>
      </header>

      <div className="policy-content">
        <p className="eyebrow">THE FAMILY STORE · THE DETAILS</p>
        <h1>Shipping &amp; Returns</h1>
        <p className="policy-intro">Good things should get to you quickly—and arrive just as they left our shelves.</p>

        <section>
          <h2>Delivery</h2>
          <p>We aim to deliver within 45 minutes to addresses in our service area during store hours. The ETA shown at checkout is an estimate and can shift with traffic, weather, order volume, or other conditions. Delivery fees and availability are shown before you place your order. If an order misses its confirmed delivery schedule, contact us and we’ll review the issue and any available remedy.</p>
          <p>If an item is unavailable, we’ll let you know and arrange a suitable replacement only with your approval; otherwise, that item will be refunded.</p>
        </section>

        <section>
          <h2>Changes &amp; cancellations</h2>
          <p>Contact us as soon as possible if you need to change or cancel an order. We can’t guarantee changes once shopping or delivery is underway.</p>
        </section>

        <section>
          <h2>Returns &amp; order issues</h2>
          <p>Because we prepare orders for quick delivery, we don’t accept change-of-mind returns. If an item arrives damaged, spoiled, expired, incorrect, or missing, contact us promptly—ideally within 24 hours—with your order number and a photo when possible.</p>
          <p>We’ll review the issue and arrange a replacement or refund for the affected item. Please keep its packaging until we respond, and don’t consume anything that appears damaged or unsafe. This policy does not limit any rights available under applicable consumer law.</p>
        </section>

        <div className="policy-contact">
          <span className="eyebrow">NEED A HAND?</span>
          <a href="mailto:hello@thefamilystore.in">hello@thefamilystore.in ↗</a>
        </div>
      </div>
    </main>
  );
}
