import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Produtos",
  description: "Catálogo e estoque de produtos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-rule">
          <div className="mx-auto w-full max-w-4xl px-4 py-4">
            <Link href="/produtos" className="text-[15px] font-semibold text-ink">
              Produtos
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
