import { ImageResponse } from "next/og";

export const alt = "DE. LAW FURNITURE LTD — Crafting Comfort. Defining Spaces.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#2a1d15", color: "#f8f4ed", padding: 72, fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, color: "#dcc8a2", fontSize: 22, letterSpacing: 8 }}>
          <div style={{ width: 60, height: 2, background: "#bfa274" }} />
          EST. 2015 · EGBE, LAGOS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, letterSpacing: 6 }}>DE. LAW</div>
          <div style={{ fontSize: 30, letterSpacing: 18, color: "#dcc8a2", marginTop: 8 }}>FURNITURE LTD</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 44, fontStyle: "italic" }}>Crafting Comfort. Defining Spaces.</div>
          <div style={{ fontSize: 22, color: "#bfa274" }}>Custom furniture · Delivery · Installation</div>
        </div>
      </div>
    ),
    size
  );
}
