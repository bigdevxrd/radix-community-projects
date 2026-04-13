import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Radix Guild — Community Governance for Radix";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Title */}
        <div style={{ fontSize: 72, fontWeight: 800, color: "#f8fafc", marginBottom: 16 }}>
          Radix Guild
        </div>
        <div style={{ fontSize: 28, color: "#94a3b8", marginBottom: 48 }}>
          Community governance infrastructure for Radix
        </div>

        {/* Pillars */}
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Governance", color: "#2dd4bf", emoji: "🗳️" },
            { label: "Bounties", color: "#4ea8de", emoji: "💰" },
            { label: "Badges", color: "#00e49f", emoji: "🛡️" },
            { label: "47 Decisions", color: "#a78bfa", emoji: "📋" },
          ].map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                borderRadius: 12,
                border: `2px solid ${p.color}40`,
                backgroundColor: `${p.color}10`,
                fontSize: 18,
                fontWeight: 600,
                color: p.color,
              }}
            >
              {p.emoji} {p.label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ marginTop: 48, fontSize: 20, color: "#2dd4bf", fontWeight: 500 }}>
          radixguild.com
        </div>
        <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
          Open Source (MIT) • On-Chain Verified • Built on Radix
        </div>

        {/* Accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #2dd4bf, #00e49f)",
            opacity: 0.4,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
