import type { Metadata } from 'next';
import { OpportunityDetailContent } from '@/components/opportunity-detail-content';

export const metadata: Metadata = {
  title: 'Detail příležitosti | Apotheke Sales Hub',
  description: 'Detail obchodní příležitosti s produkty a materiály',
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OpportunityDetailContent slug={slug} />;
}
