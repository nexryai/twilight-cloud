/// <reference lib="webworker" />
import { createDecryptStream } from "@/cipher/stream";

declare const self: ServiceWorkerGlobalScope;

let contentKey: CryptoKey | null = null;

self.addEventListener("message", (event) => {
    if (event.data?.type === "SET_KEY") {
        const jwk = event.data.key;
        if (jwk) {
            crypto.subtle
                .importKey("jwk", jwk, { name: "AES-CTR" }, true, ["encrypt", "decrypt"])
                .then((key) => {
                    contentKey = key;
                })
                .catch((err) => console.error("Failed to import key in Service Worker", err));
        }
    }
});

const VIRTUAL_PATH = "/virtual-dash/";

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith(VIRTUAL_PATH)) {
        event.respondWith(handleEncryptedStream(url));
    }
});

async function handleEncryptedStream(url: URL): Promise<Response> {
    try {
        if (!contentKey) {
            console.error("Decryption key not available in Service Worker.");
            return new Response("Decryption key not set in Service Worker", { status: 500 });
        }

        const filename = url.pathname.replace(VIRTUAL_PATH, "");
        const mediaId = url.searchParams.get("mediaId");

        if (!mediaId) {
            console.error("mediaId is missing from the request to the Service Worker");
            return new Response("mediaId query parameter is required", { status: 400 });
        }

        const apiUrl = `/api/media/${mediaId}?filename=${encodeURIComponent(filename)}`;

        const apiRes = await fetch(apiUrl);

        if (!apiRes.ok) {
            const errorText = await apiRes.text();
            console.error(`Failed to get signed URL for ${filename}. Status: ${apiRes.status}. Body: ${errorText}`);
            return new Response(`Signed URL Error: ${errorText}`, { status: apiRes.status, statusText: apiRes.statusText });
        }

        const { url: downloadUrl } = await apiRes.json();
        if (!downloadUrl) {
            return new Response("Signed URL not found in API response", { status: 500 });
        }

        console.log(`[ServiceWorker] fetching ${filename}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 6000);

        const upstreamRes = await fetch(downloadUrl, {
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!upstreamRes.ok || !upstreamRes.body) {
            console.error(`[ServiceWorker] fetching ${filename} -> FAILED: status=${upstreamRes.status}`);
            return upstreamRes;
        }

        console.log(`[ServiceWorker] fetching ${filename} -> OK`);

        const reader = upstreamRes.body.getReader();
        const decryptedStream = await createDecryptStream(contentKey, reader);

        const headers = new Headers(upstreamRes.headers);

        if (filename.endsWith(".mpd")) {
            headers.set("Content-Type", "application/dash+xml");
        } else {
            const contentType = upstreamRes.headers.get("Content-Type");
            if (contentType) {
                headers.set("Content-Type", contentType);
            }
        }

        headers.delete("Content-Length");
        headers.delete("Content-Encoding");
        headers.delete("accept-ranges");

        return new Response(decryptedStream, {
            status: 200,
            headers: headers,
        });
    } catch (error) {
        console.error("Stream Decryption Error:", error);
        return new Response("Internal Decryption Error in Service Worker", { status: 500 });
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});
