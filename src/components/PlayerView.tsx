"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import type { VideoPlayerRef } from "@/components/VideoPlayer";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
    ssr: false,
    loading: () => <div className="bg-black aspect-video flex items-center justify-center text-white">Loading Player...</div>,
});

interface PlayerViewProps {
    contentKey: CryptoKey;
    mediaId: string;
    manifestName: string;
}

export interface PlayerViewHandle {
    handleCaptureThumbnail: () => string | undefined;
}

const PlayerView = forwardRef<PlayerViewHandle, PlayerViewProps>(({ contentKey, mediaId, manifestName }, ref) => {
    const [isSwReady, setIsSwReady] = useState(false);
    const playerRef = useRef<VideoPlayerRef>(null);

    useImperativeHandle(ref, () => ({
        handleCaptureThumbnail: () => {
            const dataUrl = playerRef.current?.capture();
            if (dataUrl) {
                console.log("Captured image:", dataUrl);
                return dataUrl;
            }
            return undefined;
        },
    }));

    useEffect(() => {
        const setupSw = async () => {
            if ("serviceWorker" in navigator) {
                try {
                    const jwk = await crypto.subtle.exportKey("jwk", contentKey);
                    await navigator.serviceWorker.register("/sw.js");
                    const registration = await navigator.serviceWorker.ready;

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
        return <div className="bg-gray-800 h-full animate-pulse" />;
    }

    return (
        <div className="overflow-hidden h-full">
            <VideoPlayer ref={playerRef} mediaId={mediaId} manifestName={manifestName} />
        </div>
    );
});

PlayerView.displayName = "PlayerView";
export default PlayerView;
