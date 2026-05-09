import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timbered ERP",
  description: "Internal ERP for Timbered Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
