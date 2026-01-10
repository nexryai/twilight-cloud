import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            allowedOrigins: ["localhost:3000", "*.app.github.dev"],
            bodySizeLimit: "10mb",
        },
    },
    transpilePackages: ["ikaria.js"],
    devIndicators: false,
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin",
                    },
                    {
                        key: "Cross-Origin-Embedder-Policy",
                        value: "require-corp",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
