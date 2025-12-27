"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
    ssr: false,
    loading: () => <div className="bg-black aspect-video flex items-center justify-center text-white">Loading Player...</div>,
});

interface PlayerViewProps {
    contentKey: CryptoKey;
    mediaId: string;
    manifestName: string;
}

export default function PlayerView({ contentKey, mediaId, manifestName }: PlayerViewProps) {
    const [isSwReady, setIsSwReady] = useState(false);

    useEffect(() => {
        const setupSw = async () => {
            if ("serviceWorker" in navigator) {
                try {
                    const jwk = await crypto.subtle.exportKey("jwk", contentKey);
                    await navigator.serviceWorker.register("/sw.js");
                    const registration = await navigator.serviceWorker.ready;

                    console.log("ServiceWorker is ready.");

                    if (registration.active) {
                        registration.active.postMessage({ type: "SET_KEY", key: jwk });
                        setIsSwReady(true);
                    }
                } catch (e) {
                    console.error("SW initialization failed", e);
                }
            }
        };

        setupSw();
    }, [contentKey]);

    if (!isSwReady) {
        return <div className="bg-gray-200 aspect-video animate-pulse" />;
    }

    return (
        <div className="bg-white rounded-lg overflow-hidden">
            <VideoPlayer mediaId={mediaId} manifestName={manifestName} />
        </div>
    );
}
