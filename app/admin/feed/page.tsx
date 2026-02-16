import type { Metadata } from "next";
import siteMetadata from "@/app/metadata.json";
import { FeedAdminContent } from "@/components/feed-admin-content";

export const metadata: Metadata = {
  title: "Správa XML Feedu - Apotheke Sales Hub",
  description: "Konfigurace a synchronizace XML feedu produktů",
};

export default function FeedAdminPage() {
  return <FeedAdminContent />;
}
