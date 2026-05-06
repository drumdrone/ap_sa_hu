import type { Metadata } from "next";
import { NastaveniContent } from "@/components/nastaveni-content";

export const metadata: Metadata = {
  title: "Nastavení | Apotheke Sales Hub",
  description: "Nastavení aplikace - správa editorů a dalších možností",
};

export default function NastaveniPage() {
  return <NastaveniContent />;
}
