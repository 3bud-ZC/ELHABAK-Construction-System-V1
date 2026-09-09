import { ProjectPortal } from "../project-portal";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  return <ProjectPortal projectId={id} />;
}
