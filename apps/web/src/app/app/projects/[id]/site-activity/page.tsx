import { SiteOperations } from "../../site-operations";

type PageProps = { params: Promise<{ id: string }> };

export default async function SiteActivityPage({ params }: PageProps) {
  const { id } = await params;
  return <SiteOperations projectId={id} />;
}

