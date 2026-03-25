import { ProductDetailContent } from "@/components/product-detail-content";
import { Id } from "@/convex/_generated/dataModel";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  
  return (
    <main className="w-full py-6">
      <ProductDetailContent productId={id as Id<"products">} />
    </main>
  );
}
