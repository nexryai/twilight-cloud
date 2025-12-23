import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: ["localhost:3000", "*.app.github.dev"],
            bodySizeLimit: "10mb",
        },
    },
};

export default nextConfig;
