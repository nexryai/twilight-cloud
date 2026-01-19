"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { addThumbnailToVideo } from "@/actions/media";
import { encryptMetadata } from "@/cipher/block";
import { createEncryptTransformStream } from "@/cipher/stream";
import type { VideoPlayerRef } from "@/components/VideoPlayer";

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
    ssr: false,
    loading: () => <div className="bg-black aspect-video flex items-center justify-center text-white">Loading Player...</div>,
});

interface PlayerViewProps {
    contentKey: CryptoKey;
    metadataKey: CryptoKey;
    mediaId: string;
    manifestName: string;
}

export interface PlayerViewHandle {
    handleCaptureThumbnail: () => void;
}

const PlayerView = forwardRef<PlayerViewHandle, PlayerViewProps>(({ contentKey, metadataKey, mediaId, manifestName }, ref) => {
    const [isSwReady, setIsSwReady] = useState(false);
    const playerRef = useRef<VideoPlayerRef>(null);

    useImperativeHandle(ref, () => ({
        handleCaptureThumbnail: async () => {
            const captured = playerRef.current?.capture();
            if (!captured) return;

            try {
                const uploadUrl = await addThumbnailToVideo(mediaId, await encryptMetadata(captured.hash, metadataKey));
                console.log(`blurhash: ${captured.hash}`);

                const response = await fetch(captured.image);
                const blob = await response.blob();

                const { encryptTransform, counterBlock } = await createEncryptTransformStream(contentKey);
                const encryptedChunks: Uint8Array[] = [counterBlock];

                const reader = blob.stream().pipeThrough(encryptTransform).getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    encryptedChunks.push(value);
                }

                const encryptedBlob = new Blob(encryptedChunks as BlobPart[], { type: "application/octet-stream" });

                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/octet-stream",
                    },
                    body: encryptedBlob,
                });

                if (!uploadRes.ok) throw new Error("Failed to upload encrypted thumbnail");

                console.log("Encrypted thumbnail uploaded successfully");
            } catch (error) {
                console.error("Thumbnail processing error:", error);
            }
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
