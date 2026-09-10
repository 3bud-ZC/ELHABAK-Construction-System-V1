import { DocumentDetail } from "../../../document-detail";

type PageProps = { params: Promise<{ id: string; documentId: string }> };

export default async function ProjectDocumentDetailPage({ params }: PageProps) {
  const { id, documentId } = await params;
  return <DocumentDetail projectId={id} documentId={documentId} />;
}
