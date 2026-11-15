import type { Metadata } from "next";

// School of Engineering portal is a private link: keep it out of search engines.
export const metadata: Metadata = {
  title: "OPtioN! · School of Engineering portal",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
