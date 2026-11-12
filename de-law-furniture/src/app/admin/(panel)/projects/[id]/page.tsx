import { notFound } from "next/navigation";
import { getProjects } from "@/lib/content";
import { PageTitle } from "@/components/admin/ui";
import { ProjectForm } from "./ProjectForm";

export const metadata = { title: "Edit project" };

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = id === "new" ? null : (await getProjects(true)).find((p) => p.id === Number(id));
  if (id !== "new" && !project) notFound();
  return (
    <>
      <PageTitle title={project ? "Edit project" : "Add project"} intro="Describe only what the photo shows. Don't include customer names or addresses without their permission." />
      <ProjectForm project={project ?? null} />
    </>
  );
}
