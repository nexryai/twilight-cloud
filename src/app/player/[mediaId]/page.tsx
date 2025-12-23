"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getVideo, type Video } from "@/actions/media";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
    ssr: false,
    loading: () => <div className="bg-black aspect-video flex items-center justify-center text-white">Loading Player...</div>,
});

const KEY_STORAGE_ID = "TWILIGHT_CEK";

export default function PlayerPage() {
    const params = useParams();
    const mediaId = Array.isArray(params.mediaId) ? params.mediaId[0] : params.mediaId;

    const [video, setVideo] = useState<Video | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [error, setError] = useState<string | null>(null);
    const [isSwReady, setIsSwReady] = useState(false);

    useEffect(() => {
        if (!mediaId) {
            setStatus("error");
            setError("No media ID provided.");
            return;
        }

        const initialize = async () => {
            setStatus("loading");

            const savedKey = localStorage.getItem(KEY_STORAGE_ID);
            if (!savedKey) {
                setError("Decryption key not found.");
                setStatus("error");
                return;
            }

            try {
                const jwk = JSON.parse(savedKey);
                await crypto.subtle.importKey("jwk", jwk, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);

                if ("serviceWorker" in navigator) {
                    await navigator.serviceWorker.register("/sw.js");
                    const registration = await navigator.serviceWorker.ready;

                    if (registration.active) {
                        console.log("SET");
                        registration.active.postMessage({
                            type: "SET_KEY",
                            key: jwk,
                        });
                        setIsSwReady(true);
                    }
                } else {
                    throw new Error("Service Worker not supported");
                }

                const videoData = await getVideo(mediaId);
                if (!videoData) throw new Error("Video not found");

                setVideo(videoData);
                setStatus("ready");
            } catch (e) {
                console.error("Initialization failed", e);
                setError("Failed to initialize player environment.");
                setStatus("error");
            }
        };

        initialize();
    }, [mediaId]);

    if (status === "loading") {
        return <div className="flex items-center justify-center h-screen text-gray-500">Loading player...</div>;
    }

    if (status === "error") {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
                    <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (status === "ready" && video && isSwReady && mediaId) {
        const manifestName = video.manifest.split("/").pop();
        if (!manifestName) return <div>Invalid manifest</div>;

        return (
            <div className="bg-gray-50 min-h-screen">
                <div className="container mx-auto p-4">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <VideoPlayer mediaId={mediaId} manifestName={manifestName} />
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
