import type { Metadata } from "next";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP Dashboard",
  description: "Clean empty Next.js app scaffold",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><AppProvider>{children}</AppProvider></body>
    </html>
  );
}
