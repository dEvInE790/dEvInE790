import Nav from "@/components/site/Nav";
import Hero from "@/components/site/Hero";
import EventInfo from "@/components/site/EventInfo";
import ScrollMarquee from "@/components/site/ScrollMarquee";
import Expect from "@/components/site/Expect";
import Register from "@/components/site/Register";
import Payment from "@/components/site/Payment";
import Sponsors from "@/components/site/Sponsors";
import Footer from "@/components/site/Footer";
import Preloader from "@/components/site/Preloader";
import SmoothScroll from "@/components/site/SmoothScroll";
import { StatusProvider } from "@/components/site/useStatus";
import { getPublicStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function Home() {
  const status = await getPublicStatus();
  return (
    <StatusProvider initial={status}>
      <Preloader />
      <SmoothScroll />
      <Nav />
      <main>
        <Hero />
        <EventInfo />
        <ScrollMarquee rows={["Krazy Hours", "Dec 17 · Only 35"]} />
        <Expect />
        <Register />
        <Payment />
        <ScrollMarquee rows={["TribeWave Records", "Motion Boys Squad"]} />
        <Sponsors />
      </main>
      <Footer />
    </StatusProvider>
  );
}
