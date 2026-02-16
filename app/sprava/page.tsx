import type { Metadata } from "next";
import AdminTableContent from "@/components/admin-table-content";

export const metadata: Metadata = {
  title: "Správa produktů | Apotheke Sales Hub",
  description: "Admin tabulka pro editaci marketingových dat produktů",
};

export default function AdminPage() {
  return <AdminTableContent />;
}
