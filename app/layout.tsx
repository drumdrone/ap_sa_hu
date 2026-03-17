import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { EnvironmentBanner } from "@/components/environment-banner";
import { AccessProvider } from "@/components/access-context";
import { AccessGate } from "@/components/access-gate";
import { Header } from "@/components/header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Apotheke Sales Hub",
  description: "Interní marketingová aplikace pro prodejce BIO čajů značky Apotheke",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning={true}
      >
        <EnvironmentBanner />
        <ConvexClientProvider>
          <AccessProvider>
            <AccessGate>
              <Header />
              {children}
            </AccessGate>
          </AccessProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
