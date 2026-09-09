import { DesignDetail } from "../../../design-detail";

type PageProps = { params: Promise<{ id: string; designId: string }> };

export default async function DesignDetailPage({ params }: PageProps) {
  const { id, designId } = await params;
  return <DesignDetail projectId={id} designId={designId} />;
}
