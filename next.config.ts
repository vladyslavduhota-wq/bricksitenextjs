import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

const config: NextConfig = {
  // A stray package-lock.json in the home folder otherwise makes Next guess the wrong root.
  turbopack: { root: import.meta.dirname },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
    ],
  },
};

export default withNextIntl(config);
