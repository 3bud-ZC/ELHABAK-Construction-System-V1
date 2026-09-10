import { ChatWorkspace } from "../../chat";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectChatPage({ params }: PageProps) {
  const { id } = await params;
  return <ChatWorkspace projectId={id} />;
}
