import type { Metadata } from "next";
import TicketLookup from "@/components/ticket/TicketLookup";

export const metadata: Metadata = { title: "My ticket — KRAZY HOURS", robots: { index: false } };

export default function Page() {
  return <TicketLookup />;
}
