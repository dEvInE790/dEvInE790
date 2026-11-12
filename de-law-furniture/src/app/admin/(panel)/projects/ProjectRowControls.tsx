"use client";

import { ItemControls } from "@/components/admin/ItemControls";
import { deleteProject } from "@/app/admin/actions";

export function ProjectRowControls({ id, title, visible, first, last }: { id: number; title: string; visible: boolean; first: boolean; last: boolean }) {
  return (
    <ItemControls
      table="projects"
      id={id}
      visible={visible}
      first={first}
      last={last}
      editHref={`/admin/projects/${id}`}
      onDelete={() => deleteProject(id)}
      deleteConfirm={`Delete “${title}”? Its photo/video will be removed too. This can't be undone.`}
    />
  );
}
