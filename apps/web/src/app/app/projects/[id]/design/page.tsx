import { DesignHub } from "../../design-hub";

type PageProps = { params: Promise<{ id: string }> };

export default async function DesignHubPage({ params }: PageProps) {
  const { id } = await params;
  return <DesignHub projectId={id} />;
}
