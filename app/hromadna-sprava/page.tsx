import type { Metadata } from "next";
import BulkEditContent from "@/components/bulk-edit-content";

export const metadata: Metadata = {
  title: "Hromadná správa | Apotheke Sales Hub",
  description: "Hromadná editace marketingových materiálů pro více produktů najednou",
};

export default function BulkEditPage() {
  return <BulkEditContent />;
}
