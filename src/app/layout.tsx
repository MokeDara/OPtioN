import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { PrefsProvider } from "@/lib/prefs";
import { Toasts } from "@/components/ui";
import { SupportWidget } from "@/components/support";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "OPtioN! — optional course selection",
  description: "Pick your optional courses in one place: live seats, clear deadlines, no email back-and-forth.",
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("option-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`} suppressHydrationWarning>
      <head>
        {/* apply the saved day/night theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <PrefsProvider>
        <StoreProvider>
          {children}
          <Toasts />
          <SupportWidget />
        </StoreProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
