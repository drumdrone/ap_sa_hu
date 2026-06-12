import type { Metadata } from "next";
import { NewsletterContent } from "@/components/newsletter-content";

export const metadata: Metadata = {
  title: "Newsletter | Apotheke Sales Hub",
  description: "Správa odběratelů a rozesílání newsletteru",
};

export default function NewsletterPage() {
  return <NewsletterContent />;
}
