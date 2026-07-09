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
};

export default nextConfig;
