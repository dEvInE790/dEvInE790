"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { naira } from "@/lib/event";
import { supabaseBrowser } from "@/lib/supabase/browser";
import CheckIn from "./CheckIn";
import Settings from "./Settings";

export type Booking = {
  id: string;
  booking_code: string;
  category_name: string;
  unit_price: number;
  quantity: number;
  amount: number;
  full_name: string;
  phone: string;
  email: string;
  payment_reference: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  admin_note: string | null;
  verified_at: string | null;
  checked_in_at: string | null;
  created_at: string;
};
export type Category = { id: string; slug: string; name: string; price: number; description: string | null; active: boolean; sort_order: number };
export type EventSettings = {
  capacity: number;
  max_per_booking: number;
  bookings_open: boolean;
  bank_name: string;
  account_number: string;
  account_name: string;
};
export type Overview = {
  bookings: Booking[];
  settings: EventSettings;
  categories: Category[];
  stats: {
    capacity: number;
    remaining: number;
    ticketsConfirmed: number;
    ticketsPending: number;
    revenueConfirmed: number;
    revenuePending: number;
    checkedIn: number;
    pendingCount: number;
  };
};

const TABS = ["Overview", "Bookings", "Check-in", "Settings"] as const;
type Tab = (typeof TABS)[number];
const FILTERS = ["pending", "confirmed", "rejected", "cancelled", "all"] as const;

const badge: Record<Booking["status"], string> = {
  pending: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-[#ff6b61]/15 text-[#ffb4ae] border-[#ff6b61]/30",
  cancelled: "bg-white/10 text-white/60 border-white/15",
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Session expired");
  }
  if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`);
  return d as T;
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-blood/40 bg-blood/10" : "border-white/10 bg-white/[0.03]"}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {sub && <p className="text-xs text-white/45">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ initial, adminEmail }: { initial: Overview; adminEmail: string | null }) {
  const router = useRouter();
  const [data, setData] = useState<Overview>(initial);
  const [tab, setTab] = useState<Tab>("Overview");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [receipt, setReceipt] = useState<{ booking: Booking; url: string | null; isPdf: boolean; error?: string } | null>(null);

  const notify = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  };

  const reload = useCallback(async () => {
    try {
      setData(await api<Overview>("/api/admin/overview"));
    } catch (e) {
      notify((e as Error).message, true);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => !document.hidden && reload(), 30000);
    return () => clearInterval(id);
  }, [reload]);

  const act = async (b: Booking, action: "confirm" | "reject" | "cancel" | "reopen" | "checkin" | "undo-checkin") => {
    let note: string | undefined;
    if (action === "reject" || action === "cancel") {
      const n = window.prompt(
        `${action === "reject" ? "Reject" : "Cancel"} ${b.booking_code} (${b.full_name})?\nOptional reason shown to the customer:`,
        action === "reject" ? "Payment not received in the PalmPay account." : "",
      );
      if (n === null) return;
      note = n || undefined;
    }
    if (action === "confirm" && !window.confirm(`Confirm ${b.booking_code}?\n\nOnly confirm if ${naira(b.amount)} (ref ${b.payment_reference}) has arrived in the PalmPay account.`)) return;
    setBusy(b.id + action);
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: "PATCH", body: JSON.stringify({ action, note }) });
      notify(
        { confirm: "Payment verified — ticket issued", reject: "Booking rejected — spots released", cancel: "Booking cancelled", reopen: "Moved back to pending", checkin: "Checked in", "undo-checkin": "Check-in undone" }[action],
      );
      await reload();
      if (receipt?.booking.id === b.id) setReceipt(null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  const openReceipt = async (b: Booking) => {
    setReceipt({ booking: b, url: null, isPdf: false });
    try {
      const d = await api<{ url: string; isPdf: boolean }>(`/api/admin/bookings/${b.id}/receipt`);
      setReceipt({ booking: b, url: d.url, isPdf: d.isPdf });
    } catch (e) {
      setReceipt({ booking: b, url: null, isPdf: false, error: (e as Error).message });
    }
  };

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.bookings.filter(
      (b) =>
        (filter === "all" || b.status === filter) &&
        (!s || [b.full_name, b.phone, b.email, b.booking_code, b.payment_reference].some((v) => v.toLowerCase().includes(s))),
    );
  }, [data.bookings, filter, q]);

  const st = data.stats;
  const used = st.ticketsConfirmed + st.ticketsPending;
  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? data.bookings.length : data.bookings.filter((b) => b.status === f).length]));

  const Actions = ({ b }: { b: Booking }) => (
    <div className="flex flex-wrap gap-1.5">
      <button className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-white/40" onClick={() => openReceipt(b)}>
        Receipt
      </button>
      {b.status === "pending" && (
        <>
          <button disabled={!!busy} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50" onClick={() => act(b, "confirm")}>
            Verify
          </button>
          <button disabled={!!busy} className="rounded-full bg-[#7a1712] px-3 py-1.5 text-xs font-semibold hover:bg-[#9b1d17] disabled:opacity-50" onClick={() => act(b, "reject")}>
            Reject
          </button>
        </>
      )}
      {b.status === "confirmed" &&
        (b.checked_in_at ? (
          <button disabled={!!busy} className="rounded-full border border-white/15 px-3 py-1.5 text-xs" onClick={() => act(b, "undo-checkin")}>
            Undo check-in
          </button>
        ) : (
          <button disabled={!!busy} className="rounded-full bg-blood px-3 py-1.5 text-xs font-semibold disabled:opacity-50" onClick={() => act(b, "checkin")}>
            Check in
          </button>
        ))}
      {b.status === "confirmed" && (
        <button disabled={!!busy} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60" onClick={() => act(b, "cancel")}>
          Cancel
        </button>
      )}
      {(b.status === "rejected" || b.status === "cancelled") && (
        <button disabled={!!busy} className="rounded-full border border-white/15 px-3 py-1.5 text-xs" onClick={() => act(b, "reopen")}>
          Reopen
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-graffiti text-3xl text-blood">KRAZY HOURS</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">Organiser dashboard · {adminEmail}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/40">Refresh</button>
          <button onClick={signOut} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-blood">Sign out</button>
        </div>
      </header>

      <nav className="no-scrollbar sticky top-0 z-30 -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-white/10 bg-ink/90 px-4 backdrop-blur sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative shrink-0 px-4 py-3 font-display text-sm uppercase tracking-wider ${tab === t ? "text-white" : "text-white/45"}`}>
            {t}
            {t === "Bookings" && st.pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-black">{st.pendingCount}</span>
            )}
            {tab === t && <motion.span layoutId="tab" className="absolute inset-x-2 bottom-0 h-[2px] bg-blood" />}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="mt-6">
          {tab === "Overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Tickets sold (verified)" value={`${st.ticketsConfirmed}`} sub={`of ${st.capacity} capacity`} accent />
                <Stat label="Revenue (verified)" value={naira(st.revenueConfirmed)} sub="Confirmed bookings only" />
                <Stat label="Pending payments" value={`${st.pendingCount}`} sub={`${st.ticketsPending} tickets · ${naira(st.revenuePending)} to verify`} />
                <Stat label="Spots left" value={`${st.remaining}`} sub={`${st.checkedIn} checked in`} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
                  <span>Capacity</span>
                  <span>{used} / {st.capacity} held</span>
                </div>
                <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-white/10">
                  <div className="bg-emerald-500" style={{ width: `${(st.ticketsConfirmed / Math.max(st.capacity, 1)) * 100}%` }} title="Confirmed" />
                  <div className="bg-amber-400" style={{ width: `${(st.ticketsPending / Math.max(st.capacity, 1)) * 100}%` }} title="Pending" />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-white/50">
                  <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Confirmed {st.ticketsConfirmed}</span>
                  <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Pending {st.ticketsPending}</span>
                  <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-white/20" />Free {st.remaining}</span>
                </div>
                <p className="mt-3 text-xs text-white/40">Pending bookings hold their spots until you verify or reject them.</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl uppercase">Waiting for verification</h2>
                  <button className="text-sm text-blood-400" onClick={() => { setFilter("pending"); setTab("Bookings"); }}>See all →</button>
                </div>
                <div className="mt-3 space-y-2">
                  {data.bookings.filter((b) => b.status === "pending").slice(0, 5).map((b) => (
                    <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div>
                        <p className="font-semibold">{b.full_name} <span className="font-mono text-xs text-white/45">{b.booking_code}</span></p>
                        <p className="text-sm text-white/55">{b.quantity} × {b.category_name} · <b className="text-white">{naira(b.amount)}</b> · ref <span className="font-mono">{b.payment_reference}</span></p>
                      </div>
                      <Actions b={b} />
                    </div>
                  ))}
                  {st.pendingCount === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/45">No payments waiting. 🎉</p>}
                </div>
              </div>
            </div>
          )}

          {tab === "Bookings" && (
            <div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                  {FILTERS.map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs capitalize ${filter === f ? "border-blood bg-blood/15 text-white" : "border-white/10 text-white/55"}`}>
                      {f} <span className="opacity-60">{counts[f]}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="field !min-h-[40px] !py-2 lg:w-72" placeholder="Search name, phone, ID, ref…" value={q} onChange={(e) => setQ(e.target.value)} />
                  <a href={`/api/admin/export${filter === "all" ? "" : `?status=${filter}`}`} className="flex shrink-0 items-center rounded-full border border-white/15 px-4 text-sm hover:border-white/40">
                    ⬇ CSV
                  </a>
                </div>
              </div>

              {/* desktop table */}
              <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/10 lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.04] font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Booked</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {list.map((b) => (
                      <tr key={b.id} className="align-top hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{b.full_name}</p>
                          <p className="font-mono text-xs text-white/45">{b.booking_code}</p>
                          <p className="text-xs text-white/45">{b.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs"><a href={`tel:${b.phone}`} className="hover:text-blood-400">{b.phone}</a></td>
                        <td className="px-4 py-3">{b.quantity} × {b.category_name}</td>
                        <td className="px-4 py-3 font-semibold">{naira(b.amount)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{b.payment_reference}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${badge[b.status]}`}>{b.status}</span>
                          {b.checked_in_at && <p className="mt-1 text-[11px] text-emerald-400">✓ In {fmtDate(b.checked_in_at)}</p>}
                          {b.admin_note && <p className="mt-1 max-w-[160px] text-[11px] text-white/40">{b.admin_note}</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-white/55">{fmtDate(b.created_at)}</td>
                        <td className="px-4 py-3"><Actions b={b} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {list.length === 0 && <p className="p-8 text-center text-sm text-white/45">No bookings here.</p>}
              </div>

              {/* mobile cards */}
              <div className="mt-4 space-y-2 lg:hidden">
                {list.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{b.full_name}</p>
                        <p className="font-mono text-xs text-white/45">{b.booking_code} · {fmtDate(b.created_at)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] uppercase ${badge[b.status]}`}>{b.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-white/45">Tickets</span><br />{b.quantity} × {b.category_name}</p>
                      <p><span className="text-white/45">Amount</span><br /><b>{naira(b.amount)}</b></p>
                      <p><span className="text-white/45">Phone</span><br /><a href={`tel:${b.phone}`} className="font-mono text-xs">{b.phone}</a></p>
                      <p className="min-w-0"><span className="text-white/45">Ref</span><br /><span className="break-all font-mono text-xs">{b.payment_reference}</span></p>
                    </div>
                    <p className="mt-2 truncate text-xs text-white/45">{b.email}</p>
                    {b.checked_in_at && <p className="mt-1 text-xs text-emerald-400">✓ Checked in {fmtDate(b.checked_in_at)}</p>}
                    <div className="mt-3"><Actions b={b} /></div>
                  </div>
                ))}
                {list.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/45">No bookings here.</p>}
              </div>
            </div>
          )}

          {tab === "Check-in" && <CheckIn onChange={reload} notify={notify} />}
          {tab === "Settings" && <Settings data={data} onSaved={reload} notify={notify} />}
        </motion.div>
      </AnimatePresence>

      {/* receipt viewer */}
      <AnimatePresence>
        {receipt && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReceipt(null)}>
            <motion.div
              className="flex max-h-[92svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-ink-800 sm:rounded-3xl"
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Payment receipt"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
                <div className="text-sm">
                  <p className="font-semibold">{receipt.booking.full_name} · <span className="font-mono">{receipt.booking.booking_code}</span></p>
                  <p className="text-white/55">Expecting <b className="text-white">{naira(receipt.booking.amount)}</b> · ref <span className="font-mono">{receipt.booking.payment_reference}</span></p>
                </div>
                <button className="text-2xl leading-none text-white/60" onClick={() => setReceipt(null)} aria-label="Close">×</button>
              </div>
              <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-black p-3">
                {receipt.error ? (
                  <p className="text-sm text-[#ffb4ae]">{receipt.error}</p>
                ) : !receipt.url ? (
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blood" />
                ) : receipt.isPdf ? (
                  <a href={receipt.url} target="_blank" rel="noopener noreferrer" className="btn btn-red">Open PDF receipt</a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={receipt.url} alt="Payment receipt" className="max-h-[65svh] w-auto object-contain" />
                )}
              </div>
              <div className="space-y-3 border-t border-white/10 p-4">
                <p className="text-xs text-white/45">Screenshots can be faked. Only verify after you see the money in the PalmPay app with a matching amount and reference.</p>
                <Actions b={receipt.booking} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-3 text-sm shadow-xl ${toast.err ? "bg-[#7a1712]" : "bg-emerald-600"}`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            role="status"
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
