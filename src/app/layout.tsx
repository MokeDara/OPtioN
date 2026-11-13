import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Toasts } from "@/components/ui";
import { SupportWidget } from "@/components/support";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "OPtioN! — optional course selection",
  description: "Pick your optional courses in one place: live seats, clear deadlines, no email back-and-forth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="min-h-screen">
        <StoreProvider>
          {children}
          <Toasts />
          <SupportWidget />
        </StoreProvider>
      </body>
    </html>
  );
}
