import { notFound } from "next/navigation";

import { IconCalendarEvent, IconFileInfo, IconPlaylistAdd, IconSubtitlesEdit, IconTrashX, IconX } from "@tabler/icons-react";

import { getKeys } from "@/actions/keyring";
import { getVideo } from "@/actions/media";
import CipherGuard from "@/components/CipherGuard";
import CipherText from "@/components/CipherText";
import PlayerView from "@/components/PlayerView";

export default async function PlayerPage({ params }: { params: { mediaId: string } }) {
    const { mediaId } = await params;
    const [encryptedKeys, video] = await Promise.all([getKeys(), getVideo(mediaId)]);

    if (!video) {
        notFound();
    }

    return (
        <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
            <div className="w-full h-full flex flex-col">
                <div className="flex-1 z-10 p-8 flex justify-between items-start transition-opacity duration-500 ease-in-out">
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
                            <button type="button" className="flex items-center gap-2 px-6 py-3 border-l border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                                <IconPlaylistAdd size={20} />
                            </button>
                        </div>
                        <div className="flex items-center bg-black/20 rounded-full border border-white/10 overflow-hidden text-white">
                            <a href="/" className="flex items-center gap-2 px-6 py-3 border-l border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                                <IconX size={20} />
                            </a>
                        </div>
                    </div>
                </div>

                <CipherGuard
                    encryptedKeys={encryptedKeys}
                    Component={PlayerView}
                    componentProps={{
                        mediaId,
                        manifestName: video.manifest.split("/").pop() || "",
                    }}
                >
                    <div className="w-full h-full bg-black animate-pulse" />
                </CipherGuard>
            </div>
        </div>
    );
}
