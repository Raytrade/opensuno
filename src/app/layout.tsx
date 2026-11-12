import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpenSuno — Personal Music Workspace",
  description: "Prepare original music prompts and lyrics, save drafts, and continue securely in your own Suno account.",
  keywords: ["music workspace", "songwriting", "music prompts", "lyrics", "Suno"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} overflow-y-scroll`}>
        <Header />
        <main className="flex flex-col items-center m-auto w-full">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
