import type { Metadata } from "next";
import { PosmPageContent } from "@/components/posm-page-content";

export const metadata: Metadata = {
  title: "POSM Materiály | Apotheke Sales Hub",
  description: "Katalog POSM materiálů a objednávky pro prodejce Apotheke",
};

export default function PosmPage() {
  return <PosmPageContent />;
}
