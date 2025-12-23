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
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, POST, OPTIONS, PUT, HEAD, DELETE",
                    },
                    {
                        key: "Access-Control-Allow-Origin",
                        value: "https://twilight-dev.14fabe4a10d3c8e3e8940ce0663826a5.r2.cloudflarestorage.com",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
