/** biome-ignore-all lint/a11y/useMediaCaption: Ignore */
import type React from "react";
import { useEffect, useRef, useState } from "react";

import { MediaPlayer } from "dashjs";

const VideoPlayer: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<dashjs.MediaPlayerClass | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initSw = async () => {
            if ("serviceWorker" in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register("/sw.js");

                    if (registration.installing) {
                        await new Promise<void>((resolve) => {
                            registration.installing?.addEventListener("statechange", (e: any) => {
                                if (e.target.state === "activated") resolve();
                            });
                        });
                    }
                    await navigator.serviceWorker.ready;
                    setIsReady(true);
                } catch (error) {
                    console.error("SW registration failed:", error);
                }
            }
        };
        initSw();
    }, []);

    useEffect(() => {
        if (!isReady || !videoRef.current) return;

        // Service Worker経由でOPFS内の /out/manifest.mpd にアクセス
        const url = "/virtual-dash/manifest.mpd";

        const player = MediaPlayer().create();
        player.initialize(videoRef.current, url, true);
        playerRef.current = player;

        player.on(MediaPlayer.events.ERROR, (e: any) => {
            console.error("Dash Playback Error:", e);
        });

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [isReady]);

    return (
        <div>
            <video ref={videoRef} controls playsInline style={{ width: "100%", maxWidth: "800px", backgroundColor: "#000" }} />
        </div>
    );
};

export default VideoPlayer;
