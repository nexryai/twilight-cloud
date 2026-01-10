/** biome-ignore-all lint/a11y/useMediaCaption: Ignore */
"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

import shaka from "shaka-player/dist/shaka-player.compiled";

interface VideoPlayerProps {
    mediaId: string;
    manifestName: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ mediaId, manifestName }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isAmbientVisible, setIsAmbientVisible] = useState(false);

    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });
        let animationFrameId: number;

        const url = `/virtual-dash/${manifestName}?mediaId=${mediaId}`;
        const player = new shaka.Player(video);

        player.getNetworkingEngine()?.registerRequestFilter((type, request) => {
            const uri = new URL(request.uris[0], window.location.origin);
            uri.searchParams.set("mediaId", mediaId);
            request.uris[0] = uri.toString();
        });

        player.configure({
            streaming: {
                bufferingGoal: 60,
                rebufferingGoal: 3,
                bufferBehind: 30,
                segmentPrefetchLimit: 6,
            },
        });

        const updateAmbient = () => {
            if (ctx && video.readyState >= 2 && !video.paused && !video.ended) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            animationFrameId = requestAnimationFrame(updateAmbient);
        };

        const handleShow = () => setIsAmbientVisible(true);
        const handleHide = () => setIsAmbientVisible(false);

        video.addEventListener("playing", handleShow);
        video.addEventListener("canplay", handleShow);
        video.addEventListener("waiting", handleHide);

        canvas.width = 64;
        canvas.height = 36;
        updateAmbient();

        player.load(url).catch((e) => {
            console.error("Shaka Player Error:", e);
        });

        return () => {
            cancelAnimationFrame(animationFrameId);
            video.removeEventListener("playing", handleShow);
            video.removeEventListener("canplay", handleShow);
            video.removeEventListener("waiting", handleHide);
            player.destroy();
        };
    }, [mediaId, manifestName]);

    return (
        <div className="relative flex justify-center w-full overflow-hidden bg-black pb-16">
            <canvas
                ref={canvasRef}
                className={`fixed inset-0 w-[120%] h-[120%] -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 
                pointer-events-none blur-[100px] saturate-[2] brightness-[0.6] transition-opacity duration-1000
                ${isAmbientVisible ? "opacity-70" : "opacity-0"}`}
            />
            <video ref={videoRef} controls playsInline className="relative z-10 w-[90%] aspect-video bg-black rounded-lg" />
        </div>
    );
};

export default VideoPlayer;
