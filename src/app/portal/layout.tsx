import type { Metadata } from "next";

// DSI portal is a private link: keep it out of search engines.
export const metadata: Metadata = {
  title: "OPtioN! · DSI portal",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
