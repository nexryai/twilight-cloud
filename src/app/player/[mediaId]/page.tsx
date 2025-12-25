import { notFound } from "next/navigation";

import { IconCalendarEvent, IconFileInfo, IconPlaylistAdd, IconSubtitlesEdit, IconTrashX } from "@tabler/icons-react";

import { getKeys } from "@/actions/keyring";
import { getVideo } from "@/actions/media";
import CipherGuard from "@/components/CipherGuard";
import PlayerView from "@/components/PlayerView";

export default async function PlayerPage({ params }: { params: { mediaId: string } }) {
    const { mediaId } = await params;
    const [encryptedKeys, video] = await Promise.all([getKeys(), getVideo(mediaId)]);

    if (!video) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-6 my-2 px-4 h-full mb-32">
            <div className="flex-1 mx-auto w-full">
                <CipherGuard
                    encryptedKeys={encryptedKeys}
                    Component={PlayerView}
                    componentProps={{
                        mediaId,
                        manifestName: video.manifest.split("/").pop() || "",
                    }}
                >
                    <div className="bg-gray-200 aspect-video animate-pulse" />
                </CipherGuard>
            </div>
            <div className="flex justify-between items-stretch">
                <div className="flex flex-col gap-2 rounded-lg px-4 py-2 bg-gray-100 min-w-1/3 max-w-1/2">
                    <div>
                        <p className="text-xl font-bold">{video.name}</p>
                    </div>
                    <div>
                        <p className="flex items-center gap-2 text-sm text-gray-500">
                            <IconCalendarEvent size={16} />
                            {new Date(video.createdAt).toDateString()}
                        </p>
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
                        <p className="flex gap-2 items-center text-sm mr-4">
                            <IconFileInfo size={18} /> <span className="font-mono">{video.contentType.replace("video/", "")}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
