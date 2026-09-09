import { UsersClient } from "../users-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: PageProps) {
  const { id } = await params;
  return <UsersClient mode="edit" id={id} />;
}
