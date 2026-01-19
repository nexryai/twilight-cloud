"use client";
import { useEffect, useRef, useState } from "react";

import { IconCalendarEvent, IconFileInfo, IconPhotoPlus, IconSubtitlesEdit, IconTrashX, IconX } from "@tabler/icons-react";

import type { EncryptedKeys } from "@/actions/keyring";
import type { Video } from "@/actions/media";
import CipherGuard from "@/components/CipherGuard";
import CipherText from "@/components/CipherText";
import PlayerView, { type PlayerViewHandle } from "@/components/PlayerView";

interface PlayerPageClientProps {
    encryptedKeys: EncryptedKeys | null;
    video: Video;
    mediaId: string;
}

export default function PlayerPageClient({ encryptedKeys, video, mediaId }: PlayerPageClientProps) {
    const [isStupidBrowser, setIsStupidBrowser] = useState(false);
    const playerViewRef = useRef<PlayerViewHandle>(null);

    useEffect(() => {
        // It'll take stupid WebKit 30 years to implement this.
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL#browser_compatibility
        setIsStupidBrowser(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
    }, []);

    const captureThumbnail = () => {
        if (isStupidBrowser) {
            alert("Safari is not supported for this operation: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL#browser_compatibility");
            return;
        }

        playerViewRef.current?.handleCaptureThumbnail();
    };

    return (
        <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
            <div className="w-full h-full flex flex-col">
                <div className="flex-none z-10 p-8 flex justify-between items-start transition-opacity duration-500 ease-in-out">
                    <div className="flex flex-col gap-2 text-white drop-shadow-lg">
                        <p className="text-2xl">
                            <CipherText encryptedData={video.name} />
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                            <p className="flex items-center gap-2">
                                <IconCalendarEvent size={16} />
                                {new Date(video.createdAt).toDateString()}
                            </p>
                            <p className="flex gap-2 items-center font-mono">
                                <IconFileInfo size={18} />
                                {video.contentType.replace("video/", "")}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-black/20 rounded-full border border-white/10 overflow-hidden text-white">
                            <button type="button" className="flex items-center gap-2 px-6 py-3 hover:bg-white/20 transition-colors cursor-pointer">
                                <IconTrashX size={20} />
                            </button>
                            <button type="button" className="flex items-center gap-2 px-6 py-3 border-l border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                                <IconSubtitlesEdit size={20} />
                            </button>
                            <button type="button" className="flex items-center gap-2 px-6 py-3 border-l border-white/10 hover:bg-white/20 transition-colors cursor-pointer" onClick={captureThumbnail}>
                                <IconPhotoPlus size={20} />
                            </button>
                        </div>
                        <div className="flex items-center bg-black/20 rounded-full border border-white/10 overflow-hidden text-white">
                            <a href="/" className="flex items-center gap-2 px-6 py-3 border-l border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                                <IconX size={20} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative min-h-0">
                    <CipherGuard
                        encryptedKeys={encryptedKeys}
                        Component={PlayerView}
                        componentProps={{
                            ref: playerViewRef,
                            mediaId,
                            manifestName: video.manifest.split("/").pop() || "",
                        }}
                    >
                        <div className="w-full h-full bg-black animate-pulse" />
                    </CipherGuard>
                </div>
            </div>
        </div>
    );
}
