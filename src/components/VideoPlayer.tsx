/** biome-ignore-all lint/a11y/useMediaCaption: Ignore */
"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

import { MediaPlayer } from "dashjs";

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
        const player = MediaPlayer().create();

        // biome-ignore lint/suspicious/noExplicitAny: dash.js
        const requestInterceptor = (request: any) => {
            const uri = new URL(request.url, window.location.origin);
            uri.searchParams.set("mediaId", mediaId);
            request.url = uri.toString();
            return Promise.resolve(request);
        };

        const updateAmbient = () => {
            // 再生中のみキャンバスを更新。一時停止中は描画処理を止め、最後のフレームを維持。
            if (ctx && video.readyState >= 2 && !video.paused && !video.ended) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            animationFrameId = requestAnimationFrame(updateAmbient);
        };

        player.addRequestInterceptor(requestInterceptor);
        player.updateSettings({
            streaming: {
                buffer: {
                    initialBufferLevel: 7,
                    bufferTimeDefault: 60,
                    bufferTimeAtTopQuality: 60,
                    bufferTimeAtTopQualityLongForm: 90,
                },
            },
        });

        player.initialize(video, url, false);

        const handleShow = () => setIsAmbientVisible(true);
        const handleHide = () => setIsAmbientVisible(false);

        // 再生開始やシーク完了時に表示
        video.addEventListener("playing", handleShow);
        video.addEventListener("canplay", handleShow);
        // バッファリング（読み込み中）時のみ非表示
        video.addEventListener("waiting", handleHide);

        canvas.width = 64;
        canvas.height = 36;
        updateAmbient();

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
