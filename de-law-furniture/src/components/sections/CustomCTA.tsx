import { Parallax } from "@/components/motion/Parallax";
import { SplitText } from "@/components/motion/SplitText";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { images, type Img } from "@/lib/images";
import { whatsappLink, waMessages } from "@/lib/site";

export function CustomCTA({
  image = images.interiorOpen,
  eyebrow = "Custom Furniture",
  title = ["Have a design in mind?", "We'll craft it for you."],
  text = "Share your idea, a sketch or a reference photo. We'll advise on materials and finishes, take measurements and prepare a quotation tailored to your project.",
}: {
  image?: Img;
  eyebrow?: string;
  title?: string[];
  text?: string;
}) {
  return (
    <section className="grain relative overflow-hidden bg-espresso text-ivory" aria-label="Custom furniture">
      <Parallax speed={120} className="absolute -inset-y-40 inset-x-0">
        <Photo src={image.src} alt="" fill sizes="100vw" className="object-cover opacity-45" />
      </Parallax>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/80 to-espresso/30" />
      <div className="container-luxe relative py-32 md:py-48">
        <Reveal y={16}>
          <p className="eyebrow mb-6 flex items-center gap-4 text-gold-light">
            <span className="rule" /> {eyebrow}
          </p>
        </Reveal>
        <SplitText lines={title} className="display max-w-4xl text-5xl md:text-7xl lg:text-8xl" />
        <Reveal delay={0.25}>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-ivory/75 md:text-lg">{text}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/quote" variant="gold">Customise Your Furniture</ButtonLink>
            <ButtonLink href={whatsappLink(waMessages.custom)} variant="outline-light" icon={<WhatsAppIcon className="h-4 w-4" />}>
              Discuss on WhatsApp
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
