import { getPublicStatus } from "@/lib/status";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getPublicStatus();
  if (!status) return json({ error: "Booking system is temporarily unavailable." }, 503);
  return json(status);
}
