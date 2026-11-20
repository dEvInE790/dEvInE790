"use client";
import { useState } from "react";
import { naira } from "@/lib/event";
import { api, type Category, type Overview } from "./Dashboard";

function CategoryRow({ c, onSaved, notify }: { c: Category; onSaved: () => void; notify: (m: string, e?: boolean) => void }) {
  const [v, setV] = useState({ name: c.name, price: c.price, description: c.description ?? "", active: c.active, sort_order: c.sort_order });
  const [saving, setSaving] = useState(false);
  const dirty = v.name !== c.name || v.price !== c.price || v.description !== (c.description ?? "") || v.active !== c.active || v.sort_order !== c.sort_order;
  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/categories", { method: "PATCH", body: JSON.stringify({ id: c.id, ...v, description: v.description || null }) });
      notify("Category saved");
      onSaved();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_120px_1.4fr_auto_auto] sm:items-center">
      <input className="field !min-h-[42px] !py-2" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Name" />
      <input className="field !min-h-[42px] !py-2" type="number" min={0} value={v.price} onChange={(e) => setV({ ...v, price: Number(e.target.value) })} aria-label="Price in Naira" />
      <input className="field !min-h-[42px] !py-2" value={v.description} placeholder="Description" onChange={(e) => setV({ ...v, description: e.target.value })} aria-label="Description" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} className="h-5 w-5 accent-[#e10600]" /> On sale
      </label>
      <button className="rounded-full bg-blood px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={!dirty || saving} onClick={save}>
        {saving ? "…" : "Save"}
      </button>
    </div>
  );
}

function L({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
    </label>
  );
}

export default function Settings({ data, onSaved, notify }: { data: Overview; onSaved: () => void; notify: (m: string, e?: boolean) => void }) {
  const s = data.settings;
  const [form, setForm] = useState({ ...s });
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", price: 0 });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          capacity: Number(form.capacity),
          max_per_booking: Number(form.max_per_booking),
          bookings_open: form.bookings_open,
          bank_name: form.bank_name,
          account_number: form.account_number,
          account_name: form.account_name,
        }),
      });
      notify("Settings saved — live on the site now");
      onSaved();
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) return;
    try {
      await api("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCat.name, price: newCat.price, active: false, sort_order: data.categories.length + 1, description: null }),
      });
      setNewCat({ name: "", price: 0 });
      notify("Category added (hidden until you tick “On sale”)");
      onSaved();
    } catch (e) {
      notify((e as Error).message, true);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-6">
        <section className="space-y-4 rounded-3xl border border-white/10 p-5">
          <h2 className="font-display text-xl uppercase">Capacity</h2>
          <div className="grid grid-cols-2 gap-3">
            <L label="Total capacity" hint={`${data.stats.ticketsConfirmed + data.stats.ticketsPending} already held`}>
              <input className="field" type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </L>
            <L label="Max per booking">
              <input className="field" type="number" min={1} max={50} value={form.max_per_booking} onChange={(e) => setForm({ ...form, max_per_booking: Number(e.target.value) })} />
            </L>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[#e10600]" checked={form.bookings_open} onChange={(e) => setForm({ ...form, bookings_open: e.target.checked })} />
            Bookings open (untick to pause sales)
          </label>
        </section>
        <section className="space-y-4 rounded-3xl border border-white/10 p-5">
          <h2 className="font-display text-xl uppercase">PalmPay account</h2>
          <L label="Bank">
            <input className="field" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
          </L>
          <L label="Account number">
            <input className="field font-mono" inputMode="numeric" maxLength={10} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "") })} />
          </L>
          <L label="Account name">
            <input className="field" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          </L>
        </section>
        <button className="btn btn-red w-full" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
      </form>

      <div className="space-y-4">
        <h2 className="font-display text-xl uppercase">Ticket categories</h2>
        <p className="text-sm text-white/45">Price changes only affect new bookings. Existing bookings keep the price they paid.</p>
        {data.categories.map((c) => (
          <CategoryRow key={c.id + c.price + c.name + c.active} c={c} onSaved={onSaved} notify={notify} />
        ))}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-white/15 p-4">
          <input className="field !min-h-[42px] flex-1 !py-2" placeholder="New category (e.g. VIP)" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <input className="field !min-h-[42px] !w-32 !py-2" type="number" min={0} placeholder="Price" value={newCat.price || ""} onChange={(e) => setNewCat({ ...newCat, price: Number(e.target.value) })} />
          <button type="button" className="rounded-full border border-white/20 px-4 text-sm hover:border-blood" onClick={addCategory}>Add</button>
        </div>
        <div className="rounded-2xl bg-white/[0.03] p-4 text-sm text-white/55">
          Live prices: {data.categories.filter((c) => c.active).map((c) => `${c.name} ${naira(c.price)}`).join(" · ") || "none on sale"}
        </div>
      </div>
    </div>
  );
}
