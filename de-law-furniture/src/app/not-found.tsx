import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="grain relative flex min-h-[80svh] items-center bg-espresso text-ivory">
      <div className="container-luxe pt-24">
        <p className="eyebrow mb-6 text-gold-light">Page not found</p>
        <h1 className="display text-6xl md:text-8xl">This space is still empty.</h1>
        <p className="mt-6 max-w-lg text-ivory/70">The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back to something beautiful.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/" variant="gold">Back to home</ButtonLink>
          <ButtonLink href="/collections" variant="outline-light">Explore collections</ButtonLink>
        </div>
      </div>
    </section>
  );
}
