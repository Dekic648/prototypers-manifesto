import { ImageResponse } from "next/og";

// Generated once at build time. This is what renders when the link is shared
// anywhere with an unfurler — Slack, iMessage, LinkedIn, X.
export const alt = "The Cult of Prototyping — I prototype, therefore I am.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 120% at 50% 0%, #1a1030 0%, #050507 55%)",
          color: "#fff",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        {/* Badge, echoing the hero */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            border: "1px solid rgba(168,85,247,0.35)",
            background: "rgba(168,85,247,0.12)",
            borderRadius: "999px",
            padding: "10px 22px",
            marginBottom: "44px",
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9" />
            <path d="M17.64 15 22 10.64" />
            <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
          </svg>
          <span style={{ fontSize: "30px", color: "#e5e7eb", fontWeight: 500 }}>
            The Prototyper&rsquo;s Manifesto
          </span>
        </div>

        <div
          style={{
            fontSize: "96px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            textAlign: "center",
            color: "#fafafa",
          }}
        >
          The Cult of Prototyping
        </div>

        <div
          style={{
            marginTop: "32px",
            fontSize: "40px",
            color: "#9ca3af",
            fontWeight: 500,
          }}
        >
          I prototype, therefore I am.
        </div>
      </div>
    ),
    { ...size },
  );
}
