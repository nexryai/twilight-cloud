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

        // リクエストURLにmediaIdを付与するModifier
        player.extend(
            "RequestModifier",
            () => ({
                modifyRequestURL: (u: string) => {
                    const uri = new URL(u, window.location.origin);
                    uri.searchParams.set("mediaId", mediaId);
                    return uri.toString();
                },
            }),
            true,
        );

        player.initialize(videoRef.current, url, false);

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
