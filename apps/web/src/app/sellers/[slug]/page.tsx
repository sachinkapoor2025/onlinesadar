import SellerProfileClient from "./SellerProfileClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SellerPublicPage({ params }: Props) {
  const { slug } = await params;
  return <SellerProfileClient slug={slug} />;
}
