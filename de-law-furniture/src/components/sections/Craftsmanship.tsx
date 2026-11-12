import { ClipImage } from "@/components/motion/ClipImage";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { images } from "@/lib/images";

export const materials = [
  {
    name: "Wood",
    image: images.workshop,
    text: "Selected for strength and character, shaped into sturdy frames, tables, beds and cabinetry — then finished by hand for a smooth, lasting surface.",
  },
  {
    name: "Fabrics",
    image: images.sofaClassic,
    text: "Upholstery and drapery fabrics chosen for comfort, colour and durability — for sofas, headboards, curtains and blinds that look good for years.",
  },
  {
    name: "Plywood",
    image: images.kitchenWarm,
    text: "Quality plywood gives kitchen cabinets, wardrobes and fitted units the stable, dependable structure that everyday use demands.",
  },
];

export const process = [
  { title: "Consultation", text: "Tell us what you need — visit us in Egbe, call, or message us on WhatsApp." },
  { title: "Measurement & design", text: "We confirm dimensions, style, materials and finishes with you." },
  { title: "Personal quotation", text: "You receive a quotation based on your exact specification." },
  { title: "Manufacturing", text: "Your furniture is built by our craftsmen using premium materials." },
  { title: "Finishing", text: "Careful sanding, upholstery and detailing to a high standard." },
  { title: "Delivery & installation", text: "We deliver and install, leaving your space ready to enjoy." },
];

export function Craftsmanship({ showProcess = true }: { showProcess?: boolean }) {
  return (
    <section className="relative bg-ivory py-28 md:py-40" aria-label="Our craftsmanship">
      <div className="container-luxe">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <SectionHeading
                eyebrow="Our Craftsmanship"
                title={["Materials", "that matter."]}
                intro="Quality begins long before a piece is assembled. We source excellent materials so that every project meets high standards of quality and durability."
              />
            </div>
          </div>
          <div className="space-y-20 lg:col-span-8 lg:space-y-28">
            {materials.map((m, i) => (
              <article key={m.name} className={`grid items-end gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
                <ClipImage image={m.image} from={i % 2 ? "right" : "left"} className="aspect-[4/5] w-full" sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw" label={m.name} />
                <Reveal className="pb-4">
                  <span className="display text-6xl italic text-gold md:text-7xl">0{i + 1}</span>
                  <h3 className="display mt-4 text-4xl text-espresso md:text-5xl">{m.name}</h3>
                  <p className="mt-4 max-w-sm leading-relaxed text-taupe">{m.text}</p>
                </Reveal>
              </article>
            ))}
          </div>
        </div>

        {showProcess && (
          <div className="mt-32 border-t border-espresso/10 pt-20">
            <Reveal className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <h3 className="display text-4xl text-espresso md:text-5xl">From idea to installation</h3>
              <p className="max-w-md text-taupe">A clear, personal process — so you always know what happens next.</p>
            </Reveal>
            <Stagger as="ol" className="grid gap-px bg-espresso/10 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
              {process.map((s, i) => (
                <StaggerItem key={s.title} as="li" className="group bg-ivory p-8 transition-colors duration-700 hover:bg-cream">
                  <span className="eyebrow text-gold-deep">Step {String(i + 1).padStart(2, "0")}</span>
                  <h4 className="display mt-5 text-3xl text-espresso">{s.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-taupe">{s.text}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        )}
      </div>
    </section>
  );
}
