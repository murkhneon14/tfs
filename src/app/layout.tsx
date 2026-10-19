import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Family Store — Little things, looked after.",
  description: "The everyday store for everything your family needs.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/family-store-logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/family-store-logo.png" },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
