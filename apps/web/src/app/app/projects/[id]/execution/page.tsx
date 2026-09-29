import { ExecutionControl } from "../../execution";

type PageProps = { params: Promise<{ id: string }> };

export default async function ExecutionPage({ params }: PageProps) {
  const { id } = await params;
  return <ExecutionControl projectId={id} />;
}
