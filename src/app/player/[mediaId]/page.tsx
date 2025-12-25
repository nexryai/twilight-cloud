"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { IconCalendarEvent, IconFileInfo, IconPlaylistAdd, IconSubtitlesEdit, IconTrashX } from "@tabler/icons-react";

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
    const [error, setError] = useState<string | null>(null);
    const [isSwReady, setIsSwReady] = useState(false);

    useEffect(() => {
        if (!mediaId) {
            setError("No media ID provided.");
            return;
        }

        const initialize = async () => {
            const savedKey = localStorage.getItem(KEY_STORAGE_ID);
            if (!savedKey) {
                setError("Decryption key not found.");
                return;
            }

            try {
                const jwk = JSON.parse(savedKey);
                await crypto.subtle.importKey("jwk", jwk, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);

                if ("serviceWorker" in navigator) {
                    await navigator.serviceWorker.register("/sw.js");
                    const registration = await navigator.serviceWorker.ready;

                    if (registration.active) {
                        registration.active.postMessage({ type: "SET_KEY", key: jwk });
                        setIsSwReady(true);
                    }
                } else {
                    throw new Error("Service Worker not supported");
                }

                const videoData = await getVideo(mediaId);
                if (!videoData) throw new Error("Video not found");

                setVideo(videoData);
            } catch (e) {
                console.error("Initialization failed", e);
                setError("Failed to initialize player environment.");
            }
        };

        initialize();
    }, [mediaId]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
                    <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    const isLoading = !video || !isSwReady;

    return (
        <div className="flex flex-col gap-6 my-2 px-4 h-full">
            <div className="flex-1 mx-auto w-full">
                <div className="bg-white rounded-lg overflow-hidden">{isLoading ? <div className="bg-gray-200 aspect-video animate-pulse" /> : <VideoPlayer mediaId={mediaId as string} manifestName={video.manifest.split("/").pop() || ""} />}</div>
            </div>
            <div className="flex justify-between items-stretch">
                <div className="flex flex-col gap-2 rounded-lg px-4 py-2 bg-gray-100 min-w-1/3 max-w-1/2">
                    <div>{isLoading ? <div className="h-7 bg-gray-200 rounded w-1/3 animate-pulse" /> : <p className="text-xl font-bold">{video.name}</p>}</div>
                    <div>
                        {isLoading ? (
                            <div className="h-5 bg-gray-200 rounded w-1/4 animate-pulse" />
                        ) : (
                            <p className="flex items-center gap-2 text-sm text-gray-500">
                                <IconCalendarEvent size={16} />
                                {new Date(video.createdAt).toDateString()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col justify-between">
                    <div className="flex text-sm text-gray-800">
                        <button type="button" className="flex items-center gap-2 rounded-l-full px-5 py-2 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
                            <IconTrashX size={20} />
                            Delete
                        </button>
                        <button type="button" className="flex items-center border-l border-r border-gray-200 gap-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
                            <IconSubtitlesEdit size={20} />
                            Rename
                        </button>
                        <button type="button" className="flex items-center gap-2 rounded-r-full px-5 py-2 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors">
                            <IconPlaylistAdd size={20} />
                            Playlist
                        </button>
                    </div>
                    <div className="flex-1 flex justify-end items-end text-gray-500">
                        {!isLoading && (
                            <p className="flex gap-2 items-center text-sm mr-4">
                                <IconFileInfo size={18} /> <span className="font-mono">{video.contentType.replace("video/", "")}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
