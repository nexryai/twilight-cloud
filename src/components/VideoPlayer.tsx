/** biome-ignore-all lint/a11y/useMediaCaption: ? */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: ? */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: ? */
"use client";
import type React from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { IconMaximize, IconPictureInPicture, IconPlayerPause, IconPlayerPlay, IconSettings, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { encode } from "blurhash";
import shaka from "shaka-player/dist/shaka-player.compiled";

interface VideoPlayerProps {
    mediaId: string;
    manifestName: string;
}

export interface VideoPlayerRef {
    capture: () => { image: string; hash: string } | null;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ mediaId, manifestName }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isAmbientVisible, setIsAmbientVisible] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [buffered, setBuffered] = useState(0);
    const [isFullWidth, setIsFullWidth] = useState(false);

    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;

        // biome-ignore lint/suspicious/noExplicitAny: ignore here
        const handleError = (error: any) => {
            if (error instanceof Error) {
                // shaka crashed with an unhandled native error
                console.error(`shaka-player crashed! : ${error}`);
            }

            console.error(`shaka-player error: ${error}`);
        };

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });
        let animationFrameId: number;

        const url = `/virtual-dash/${manifestName}?mediaId=${mediaId}`;
        const player = new shaka.Player(video);

        player.addEventListener("error", (event) => handleError(event));

        // biome-ignore lint/correctness/noUnusedFunctionParameters: ignore here
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
                segmentPrefetchLimit: 4,
                retryParameters: {
                    maxAttempts: 8,
                },
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
            console.error("Shaka Player Crashed! :", e);
        });

        return () => {
            cancelAnimationFrame(animationFrameId);
            video.removeEventListener("playing", handleShow);
            video.removeEventListener("canplay", handleShow);
            video.removeEventListener("waiting", handleHide);
            player.destroy();
        };
    }, [mediaId, manifestName]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleDurationChange = () => setDuration(video.duration);
        const handleVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };
        const handleProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        video.addEventListener("play", handlePlay);
        video.addEventListener("pause", handlePause);
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("durationchange", handleDurationChange);
        video.addEventListener("volumechange", handleVolumeChange);
        video.addEventListener("progress", handleProgress);

        return () => {
            video.removeEventListener("play", handlePlay);
            video.removeEventListener("pause", handlePause);
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("durationchange", handleDurationChange);
            video.removeEventListener("volumechange", handleVolumeChange);
            video.removeEventListener("progress", handleProgress);
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const checkWidth = () => {
            const videoWidth = video.getBoundingClientRect().width;
            const windowWidth = window.innerWidth;
            setIsFullWidth(Math.abs(videoWidth - windowWidth) < 16);
        };

        const observer = new ResizeObserver(checkWidth);
        observer.observe(video);
        window.addEventListener("resize", checkWidth);

        checkWidth();

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", checkWidth);
        };
    }, []);

    const capture = (): { image: string; hash: string } | null => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return null;

        const targetHeight = 720;
        const aspectRatio = video.videoWidth / video.videoHeight;
        const targetWidth = targetHeight * aspectRatio;

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL("image/webp", 0.75);

        // Encode blurhash
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return null;

        const hashWidth = 64;
        const hashHeight = Math.round(64 / aspectRatio);
        tempCanvas.width = hashWidth;
        tempCanvas.height = hashHeight;

        tempCtx.drawImage(video, 0, 0, hashWidth, hashHeight);
        const pixels = tempCtx.getImageData(0, 0, hashWidth, hashHeight);

        const hash = encode(pixels.data, pixels.width, pixels.height, 4, 3);

        return {
            image: imageDataUrl,
            hash: hash,
        };
    };

    useImperativeHandle(ref, () => ({
        capture,
    }));

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    };

    const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.volume = Math.max(0, Math.min(1, pos));
        if (video.volume > 0) video.muted = false;
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
    };

    const changePlaybackRate = (rate: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
    };

    const togglePiP = async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (e) {
            console.error("PiP Error:", e);
        }
    };

    const toggleFullscreen = async () => {
        const container = containerRef.current;
        if (!container) return;
        try {
            if (!document.fullscreenElement) {
                await container.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (e) {
            console.error("Fullscreen Error:", e);
        }
    };

    const formatTime = (time: number) => {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 1000);
    };

    const handleMouseLeave = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 1000);
        }
    };

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
        <div ref={containerRef} className="relative mx-auto h-full max-w-full aspect-video overflow-hidden bg-black group pb-8" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <canvas
                ref={canvasRef}
                className={`fixed inset-0 w-[120%] h-[120%] -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 
                pointer-events-none blur-[100px] saturate-[2] brightness-[0.6] transition-opacity duration-1000
                ${isAmbientVisible ? "opacity-70" : "opacity-0"}`}
            />

            <div className="relative z-10 w-full h-full flex items-center justify-center">
                <video
                    ref={videoRef}
                    playsInline
                    className={`max-w-full max-h-full cursor-pointer object-contain transition-all 
                        ${!isFullWidth ? "rounded-lg" : ""}`}
                    onClick={togglePlay}
                />
            </div>
            {/* Custom Controls */}
            <div className={`fixed bottom-0 left-0 right-0 z-20 bg-linear-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="h-1.5 bg-white/20 rounded-full cursor-pointer relative group/progress" onClick={handleSeek}>
                        {/* Buffered */}
                        <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${(buffered / duration) * 100}%` }} />
                        {/* Progress */}
                        <div className="absolute h-full bg-white rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
                        {/* Thumb */}
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: "-6px" }} />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    {/* Left Controls */}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={togglePlay} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            {isPlaying ? <IconPlayerPause size={20} className="text-white" /> : <IconPlayerPlay size={20} className="text-white" />}
                        </button>

                        {/* Volume */}
                        <div className="flex items-center gap-2 group/volume">
                            <button type="button" onClick={toggleMute} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                                {isMuted || volume === 0 ? <IconVolumeOff size={18} className="text-white" /> : <IconVolume size={18} className="text-white" />}
                            </button>
                            <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300">
                                <div className="h-1 bg-white/20 rounded-full cursor-pointer relative" onClick={handleVolumeChange}>
                                    <div className="absolute h-full bg-white rounded-full" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Time */}
                        <span className="text-white text-sm font-medium">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2">
                        {/* Speed */}
                        <div className="relative">
                            <button type="button" onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                                <IconSettings size={18} className="text-white" />
                            </button>
                            {showSpeedMenu && (
                                <div className="absolute w-32 bottom-full right-0 mb-2 bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden">
                                    {speedOptions.map((speed) => (
                                        <button type="button" key={speed} onClick={() => changePlaybackRate(speed)} className={`block w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${playbackRate === speed ? "text-white font-bold" : "text-gray-200"}`}>
                                            {speed}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PiP */}
                        <button type="button" onClick={togglePiP} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                            <IconPictureInPicture size={18} className="text-white" />
                        </button>

                        {/* Fullscreen */}
                        <button type="button" onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                            <IconMaximize size={18} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
