import { ProductDetailContent } from "@/components/product-detail-content";
import { Id } from "@/convex/_generated/dataModel";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  
  return (
    <main className="max-w-7xl mx-auto py-6">
      <ProductDetailContent productId={id as Id<"products">} />
    </main>
  );
}
