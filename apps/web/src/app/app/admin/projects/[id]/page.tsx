import { ProjectForm } from "../project-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { id } = await params;
  return <ProjectForm mode="edit" projectId={id} />;
}
