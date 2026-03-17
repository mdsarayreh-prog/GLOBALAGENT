import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global Agent Enterprise Workspace",
  description: "Governed multi-agent orchestration for enterprise operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
