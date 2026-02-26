import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import I18nProvider from "@/i18n/I18nProvider";
import AntdGlobalProvider from "@/contexts/AntdGlobalProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LiteLLM Dashboard",
  description: "LiteLLM Proxy Admin UI",
  icons: { icon: "./favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AntdGlobalProvider><I18nProvider>{children}</I18nProvider></AntdGlobalProvider>
      </body>
    </html>
  );
}
