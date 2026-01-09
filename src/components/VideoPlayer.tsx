/** biome-ignore-all lint/a11y/useMediaCaption: Ignore */
"use client";

import type React from "react";
import { useEffect, useRef } from "react";

import { MediaPlayer } from "dashjs";

interface VideoPlayerProps {
    mediaId: string;
    manifestName: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ mediaId, manifestName }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current) return;

        const url = `/virtual-dash/${manifestName}?mediaId=${mediaId}`;
        const player = MediaPlayer().create();

        // biome-ignore lint/suspicious/noExplicitAny: dash.js
        const requestInterceptor = (request: any) => {
            const uri = new URL(request.url, window.location.origin);
            uri.searchParams.set("mediaId", mediaId);
            request.url = uri.toString();

            return Promise.resolve(request);
        };

        player.addRequestInterceptor(requestInterceptor);

        player.updateSettings({
            streaming: {
                buffer: {
                    bufferTimeDefault: 60,
                    bufferTimeAtTopQuality: 60, // 最高画質時のバッファ時間
                    bufferTimeAtTopQualityLongForm: 90, // 長時間コンテンツ用
                },
            },
        });

        player.initialize(videoRef.current, url, false);

        // biome-ignore lint/suspicious/noExplicitAny: dash.js
        player.on(MediaPlayer.events.ERROR, (e: any) => {
            console.error("Dash.js Error:", e.error?.message || e);
        });

        return () => {
            player.destroy();
        };
    }, [mediaId, manifestName]);

    return <video ref={videoRef} controls playsInline style={{ width: "100%", aspectRatio: "16/9", backgroundColor: "#000" }} />;
};

export default VideoPlayer;
