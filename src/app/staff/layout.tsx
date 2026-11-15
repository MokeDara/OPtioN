import type { Metadata } from "next";

// Staff sign-in is a private link: keep it out of search engines.
export const metadata: Metadata = {
  title: "OPtioN! · Course director access",
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
