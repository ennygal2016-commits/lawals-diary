import { tokenHex } from "@/lib/design-tokens";

/** Shared Open Graph card layout (1200×630), drawn with our tokens. Rendered by next/og (no extra dependency). */
export const OG_SIZE = { width: 1200, height: 630 };

export function OgCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const bg = tokenHex("bg");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: bg,
        color: tokenHex("fg"),
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 120, right: 120, display: "flex" }}>
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 300,
            border: `3px solid ${tokenHex("accent")}`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 300,
            border: `3px solid ${tokenHex("lavender")}`,
            opacity: 0.5,
            marginLeft: -110,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: tokenHex("muted"),
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{ display: "flex", fontSize: title.length > 40 ? 64 : 88, lineHeight: 1.05, maxWidth: 900 }}
      >
        {title}
      </div>
      <div style={{ display: "flex", fontSize: 26, color: tokenHex("accent") }}>{footer}</div>
    </div>
  );
}
