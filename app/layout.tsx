import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { EnvironmentBanner } from "@/components/environment-banner";
import { AccessProvider } from "@/components/access-context";
import { AccessGate } from "@/components/access-gate";
import { Header } from "@/components/header";
import { GlobalSearchBar } from "@/components/global-search-bar";
import { ClientErrorBoundary } from "@/components/client-error-boundary";

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
  const appEnv = (process.env.NEXT_PUBLIC_ENVIRONMENT || "").toLowerCase();
  const convexDeployment = process.env.CONVEX_DEPLOYMENT || "";
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  const deploymentPrefix = convexDeployment.includes(":")
    ? convexDeployment.split(":", 1)[0].toLowerCase()
    : "";
  const deploymentSlug = convexDeployment.includes(":")
    ? convexDeployment.split(":").slice(1).join(":")
    : convexDeployment;
  const convexUrlSlugMatch = convexUrl.match(/^https?:\/\/([^.]+)\./);
  const convexUrlSlug = convexUrlSlugMatch ? convexUrlSlugMatch[1] : "";

  const isProdEnv = appEnv === "production";
  const prodPrefixMismatch = isProdEnv && deploymentPrefix && deploymentPrefix !== "prod";
  const slugMismatch =
    deploymentSlug && convexUrlSlug && deploymentSlug.toLowerCase() !== convexUrlSlug.toLowerCase();

  const deploymentMismatch =
    (prodPrefixMismatch || slugMismatch)
      ? { env: appEnv, deployment: convexDeployment }
      : null;

  return (
    <html lang="cs">
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning={true}
      >
        <EnvironmentBanner deploymentMismatch={deploymentMismatch} />
        <ConvexClientProvider>
          <AccessProvider>
            <AccessGate>
              <Header />
              <ClientErrorBoundary fallback={null}>
                <GlobalSearchBar />
              </ClientErrorBoundary>
              {children}
            </AccessGate>
          </AccessProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
