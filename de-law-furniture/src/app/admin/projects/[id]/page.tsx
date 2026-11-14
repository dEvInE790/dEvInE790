"use client";

import { useParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminApp";
import { useLoad } from "@/components/admin/useLoad";
import { LoadState } from "@/components/admin/LoadState";
import { PageTitle } from "@/components/admin/ui";
import { ProjectForm } from "./ProjectForm";

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAdmin();
  const isNew = id === "new";
  const { data, error, loading, reload } = useLoad(async () => (isNew ? null : (await api.listProjects()).find((p) => p.id === Number(id)) ?? "missing"), [api, id]);
  return (
    <>
      <PageTitle title={isNew ? "Add project" : "Edit project"} intro="Describe only what the photo shows. Don't include customer names or addresses without their permission." />
      {data === "missing" ? (
        <p className="text-sm text-taupe">This project no longer exists.</p>
      ) : isNew || data ? (
        <ProjectForm project={data || null} />
      ) : (
        <LoadState loading={loading} error={error} onRetry={reload} />
      )}
    </>
  );
}
