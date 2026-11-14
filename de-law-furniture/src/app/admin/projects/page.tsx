"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useAdmin } from "@/components/admin/AdminApp";
import { useLoad } from "@/components/admin/useLoad";
import { LoadState } from "@/components/admin/LoadState";
import { ItemControls } from "@/components/admin/ItemControls";
import { PageTitle } from "@/components/admin/ui";
import { btn } from "@/components/admin/styles";
import { labelOfFilter } from "@/lib/project-filters";

export default function AdminProjects() {
  const { api } = useAdmin();
  const { data: projects, error, loading, reload } = useLoad(() => api.listProjects(), [api]);
  return (
    <>
      <PageTitle
        title="Projects"
        intro="Your portfolio. The first five visible projects appear in “Featured Projects” on the homepage — use the arrows to reorder. Hidden projects stay here but don't show on the website."
        actions={
          <Link href="/admin/projects/new" className={btn.primary}>
            <Plus className="h-4 w-4" /> Add project
          </Link>
        }
      />
      {!projects ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : projects.length === 0 ? (
        <p className="border border-dashed border-espresso/20 bg-white p-10 text-center text-sm text-taupe">No projects yet. Add your first one.</p>
      ) : (
        <ol className="divide-y divide-espresso/10 border border-espresso/10 bg-white">
          {projects.map((p, i) => {
            const featured = p.visible && projects.filter((x) => x.visible).indexOf(p) < 5;
            return (
              <li key={p.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link href={`/admin/projects/${p.id}`} className="flex flex-1 items-center gap-4">
                  <span className="w-6 text-center text-xs text-taupe">{i + 1}</span>
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {p.video && <span className="absolute bottom-1 left-1 bg-espresso/80 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wider text-ivory">Video</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-espresso">{p.title}</p>
                    <p className="text-xs text-taupe">
                      {labelOfFilter(p.category)} · {p.size} tile{featured ? " · Featured on homepage" : ""}
                      {!p.visible && <span className="text-[#a4442e]"> · Hidden</span>}
                    </p>
                  </div>
                </Link>
                <ItemControls
                  table="projects"
                  id={p.id}
                  visible={p.visible}
                  first={i === 0}
                  last={i === projects.length - 1}
                  editHref={`/admin/projects/${p.id}`}
                  onDelete={() => api.deleteProject(p.id)}
                  deleteConfirm={`Delete “${p.title}”? Its photo/video will be removed too. This can't be undone.`}
                  onChanged={reload}
                />
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
