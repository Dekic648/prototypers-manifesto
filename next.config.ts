import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next.js doesn't get confused by
  // lockfiles elsewhere on the machine.
  turbopack: {
    root: __dirname,
  },
  images: {
    // The only avatar host we can receive, since GitHub is the only OAuth
    // provider enabled. Email sign-ups have no avatar and fall back to an
    // initial. next/image throws on an unlisted host, so AVATAR_HOST in
    // components/auth/auth-menu.tsx must stay in step with this list.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nothing here is meant to be embedded. This is what stops /admin
          // from being framed and its Approve/Delete buttons clickjacked.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Don't let the browser second-guess a response's declared type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full URL (which can carry an ?code=) to other sites.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
