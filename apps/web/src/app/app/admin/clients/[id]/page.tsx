import { ClientsClient } from "../clients-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientDetailsPage({ params }: PageProps) {
  const { id } = await params;
  return <ClientsClient mode="edit" id={id} />;
}
