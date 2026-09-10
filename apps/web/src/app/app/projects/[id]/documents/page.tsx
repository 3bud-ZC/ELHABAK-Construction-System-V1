import { DocumentsHub } from "../../documents-hub";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectDocumentsPage({ params }: PageProps) {
  const { id } = await params;
  return <DocumentsHub projectId={id} />;
}
