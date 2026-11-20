/** Static event facts (the parts that never change). */
export const EVENT = {
  name: "KRAZY HOURS",
  type: "Apartment Party",
  presenters: ["TribeWave Records", "Motion Boys Squad"],
  dateLabel: "December 17",
  dateLong: "Thursday, 17 December 2026",
  timeLabel: "10 PM – 5 AM",
  // 10 PM Lagos time (WAT, UTC+1)
  startsAt: "2026-12-17T22:00:00+01:00",
  endsAt: "2026-12-18T05:00:00+01:00",
  capacity: 35, // fallback only — the live number comes from the database
  address: "Road 13, Block 13, Diamond Estate, Isheri, opposite Jendol Supermarket",
  mapsQuery: "Diamond Estate Isheri opposite Jendol Supermarket, Lagos, Nigeria",
};

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  EVENT.mapsQuery,
)}`;

export const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

export type PublicStatus = {
  capacity: number;
  registered: number;
  confirmed: number;
  remaining: number;
  bookings_open: boolean;
  bank_name: string;
  account_number: string;
  account_name: string;
  categories: { id: string; slug: string; name: string; price: number; description: string | null }[];
};
