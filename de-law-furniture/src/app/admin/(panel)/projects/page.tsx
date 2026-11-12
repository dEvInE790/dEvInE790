import Link from "next/link";
import { Plus } from "lucide-react";
import { getProjects } from "@/lib/content";
import { labelOfFilter } from "@/lib/project-filters";
import { PageTitle } from "@/components/admin/ui";
import { btn } from "@/components/admin/styles";
import { ProjectRowControls } from "./ProjectRowControls";

export const metadata = { title: "Projects" };

export default async function AdminProjects() {
  const projects = await getProjects(true);
  return (
    <>
      <PageTitle
        title="Projects"
        intro="Your portfolio. The first five appear in “Featured Projects” on the homepage — use the arrows to reorder. Hidden projects stay here but don't show on the website."
        actions={
          <Link href="/admin/projects/new" className={btn.primary}>
            <Plus className="h-4 w-4" /> Add project
          </Link>
        }
      />
      {projects.length === 0 ? (
        <p className="border border-dashed border-espresso/20 bg-white p-10 text-center text-sm text-taupe">No projects yet. Add your first one.</p>
      ) : (
        <ol className="divide-y divide-espresso/10 border border-espresso/10 bg-white">
          {projects.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-4">
                <span className="w-6 text-center text-xs text-taupe">{i + 1}</span>
                <div className="relative h-16 w-20 shrink-0 overflow-hidden bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  {p.video && <span className="absolute bottom-1 left-1 bg-espresso/80 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wider text-ivory">Video</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-espresso">{p.title}</p>
                  <p className="text-xs text-taupe">
                    {labelOfFilter(p.category)} · {p.size} tile {i < 5 && p.visible ? "· Featured on homepage" : ""} {!p.visible && <span className="text-[#a4442e]">· Hidden</span>}
                  </p>
                </div>
              </div>
              <ProjectRowControls id={p.id} title={p.title} visible={p.visible} first={i === 0} last={i === projects.length - 1} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
