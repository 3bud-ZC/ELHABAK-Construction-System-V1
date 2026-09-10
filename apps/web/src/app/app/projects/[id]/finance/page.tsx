import { Finance } from "../../finance";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectFinancePage({ params }: PageProps) {
  const { id } = await params;
  return <Finance projectId={id} />;
}
