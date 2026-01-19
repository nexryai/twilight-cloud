"use client";

import { useEffect, useMemo, useState } from "react";

import { IconDotsVertical, IconFolders, IconHelpCircle, IconMoodPuzzled, IconPlus, IconUpload, IconUserCircle, IconVideo } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import { addVideoToPlaylist, createPlaylist, getPlaylists, type Playlist, removeVideoFromPlaylist, type Video } from "@/actions/media";
import { decryptMetadata, encryptMetadata } from "@/cipher/block";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CipherBlurhash from "./CipherBlurhash";
import CipherText from "./CipherText";

type DecryptedVideo = Video & { decryptedName: string };

interface VideoDashboardProps {
    contentKey: CryptoKey;
    metadataKey: CryptoKey;
    videos: Video[];
    initialPlaylists: Playlist[];
}

const VideoThumbnail = ({ video, isSwReady }: { video: DecryptedVideo; isSwReady: boolean }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const showThumbnail = video.hasThumbnail && isSwReady;

    return (
        <a href={`/player/${video._id}`} className="relative block w-full h-42 overflow-hidden rounded-lg bg-gray-50">
            {showThumbnail && <img src={`/virtual-dash/thumbnail.webp?mediaId=${video._id}`} alt={video.decryptedName} className={`object-cover w-full h-full transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`} onLoad={() => setIsLoaded(true)} />}

            {!isLoaded && (
                <div className="absolute inset-0 w-full h-full">
                    {video.blurhash ? (
                        <CipherBlurhash encryptedHash={video.blurhash} />
                    ) : (
                        <div className="flex justify-center items-center p-2 text-gray-500 group-hover:text-black transition-all duration-300 w-full h-full">
                            <IconVideo size={20} />
                        </div>
                    )}
                </div>
            )}
        </a>
    );
};

const VideoDashboard = ({ contentKey, metadataKey, videos, initialPlaylists }: VideoDashboardProps) => {
    const [decryptedVideos, setDecryptedVideos] = useState<DecryptedVideo[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [isSwReady, setIsSwReady] = useState(false);

    useEffect(() => {
        const setupSw = async () => {
            if ("serviceWorker" in navigator) {
                try {
                    const jwk = await crypto.subtle.exportKey("jwk", contentKey);
                    await navigator.serviceWorker.register("/sw.js");
                    const registration = await navigator.serviceWorker.ready;

                    if (registration.active) {
                        registration.active.postMessage({ type: "SET_KEY", key: jwk });
                        setIsSwReady(true);
                    }
                } catch (e) {
                    console.error("SW initialization failed", e);
                }
            }
        };
        setupSw();
    }, [contentKey]);

    useEffect(() => {
        const decryptAll = async () => {
            const results = await Promise.all(
                videos.map(async (v) => ({
                    ...v,
                    decryptedName: await decryptMetadata(v.name, metadataKey),
                })),
            );
            setDecryptedVideos(results);
        };
        if (videos.length > 0) decryptAll();
    }, [videos, metadataKey]);

    const handleCreatePlaylist = async () => {
        const playlistName = prompt("Enter new playlist name:");
        if (playlistName) {
            try {
                await createPlaylist(await encryptMetadata(playlistName, metadataKey));
                const playlistsData = await getPlaylists();
                setPlaylists(playlistsData);
            } catch (error) {
                console.error("Failed to create playlist", error);
            }
        }
    };

    const handleAddVideoToPlaylist = async (playlistId: string, videoId: string) => {
        await addVideoToPlaylist(playlistId, videoId);
        setPlaylists(await getPlaylists());
    };

    const handleRemoveVideoToPlaylist = async (playlistId: string, videoId: string) => {
        await removeVideoFromPlaylist(playlistId, videoId);
        setPlaylists(await getPlaylists());
    };

    const filteredVideos = useMemo(() => {
        if (!selectedPlaylist) return decryptedVideos;
        const videoIdsInPlaylist = new Set(selectedPlaylist.videoIds.map((id) => id.toString()));
        return decryptedVideos.filter((video) => videoIdsInPlaylist.has(video._id.toString()));
    }, [decryptedVideos, selectedPlaylist]);

    const groupedVideos = useMemo(() => {
        const groups = filteredVideos.reduce(
            (acc, video) => {
                const firstLetter = video.decryptedName?.[0]?.toUpperCase() ?? "#";
                if (!acc[firstLetter]) acc[firstLetter] = [];
                acc[firstLetter].push(video);
                return acc;
            },
            {} as Record<string, DecryptedVideo[]>,
        );

        for (const letter in groups) {
            groups[letter].sort((a, b) => a.decryptedName.localeCompare(b.decryptedName));
        }

        return groups;
    }, [filteredVideos]);

    return (
        <div className="max-w-400 mx-auto px-6 md:px-16 pt-12">
            <AnimatePresence mode="wait">
                <div className="flex flex-col md:flex-row gap-12">
                    <aside className="w-full md:w-64 shrink-0">
                        <div className="mt-4 flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Settings</h2>
                            <button type="button" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <IconHelpCircle size={18} />
                            </button>
                        </div>
                        <button type="button" className="w-full flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg text-sm transition-colors hover:bg-gray-100 text-gray-700">
                            <IconUserCircle size={18} />
                            <span>Account Settings</span>
                        </button>
                        <div className="mt-6 flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Playlists</h2>
                            <button type="button" onClick={handleCreatePlaylist} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <IconPlus size={18} />
                            </button>
                        </div>
                        <nav className="space-y-1">
                            <button type="button" onClick={() => setSelectedPlaylist(null)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedPlaylist ? "bg-gray-100 text-black" : "hover:bg-gray-100 text-gray-700"}`}>
                                <IconFolders size={18} />
                                <span>All Videos</span>
                                <span className="ml-auto text-xs opacity-60">{videos.length}</span>
                            </button>
                            {playlists.map((playlist) => (
                                <button
                                    type="button"
                                    key={playlist._id.toString()}
                                    onClick={() => setSelectedPlaylist(playlist)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedPlaylist?._id.toString() === playlist._id.toString() ? "bg-gray-100 text-black" : "hover:bg-gray-100 text-gray-700"}`}
                                >
                                    <IconVideo size={18} />
                                    <span className="truncate">
                                        <CipherText encryptedData={playlist.name} />
                                    </span>
                                    <span className="ml-auto text-xs opacity-60">{playlist.videoIds.length}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <main className="flex-1">
                        <AnimatePresence mode="popLayout">
                            {Object.entries(groupedVideos)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([letter, vids]) => (
                                    <motion.div layout key={letter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
                                        <h3 className="text-lg font-bold mb-4 border-b border-gray-100 pb-2 text-gray-400">{letter}</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            {vids.map((video) => (
                                                <div key={video._id.toString()} className="flex flex-col justify-between gap-3 items-center bg-white p-4 rounded-xl border border-gray-200 group transition-colors hover:border-gray-300">
                                                    <div className="flex flex-col gap-3 items-center w-full">
                                                        <VideoThumbnail video={video} isSwReady={isSwReady} />
                                                        <div className="flex justify-between items-center gap-2 w-full">
                                                            {/* DO NOT REMOVE min-w-0: Stupid WebKit won't break lines without it ¯\_(ツ)_/¯¯ */}
                                                            <a href={`/player/${video._id}`} className="min-w-0  ml-2 overflow-hidden font-medium text-gray-700 group-hover:text-black wrap-break-word">
                                                                {video.decryptedName}
                                                            </a>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button type="button" className="cursor-pointer p-2 rounded-md hover:bg-gray-100">
                                                                        <IconDotsVertical size={18} />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent className="w-56" align="start">
                                                                    <DropdownMenuGroup>
                                                                        <DropdownMenuItem>
                                                                            Play
                                                                            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem>
                                                                            Rename
                                                                            <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSub>
                                                                            <DropdownMenuSubTrigger>Playlists...</DropdownMenuSubTrigger>
                                                                            <DropdownMenuPortal>
                                                                                <DropdownMenuSubContent>
                                                                                    {playlists.map((playlist) => (
                                                                                        <DropdownMenuCheckboxItem
                                                                                            key={playlist._id.toString()}
                                                                                            checked={playlist.videoIds.includes(video._id)}
                                                                                            onCheckedChange={(checked: boolean) => {
                                                                                                checked ? handleAddVideoToPlaylist(playlist._id.toString(), video._id.toString()) : handleRemoveVideoToPlaylist(playlist._id.toString(), video._id.toString());
                                                                                            }}
                                                                                        >
                                                                                            <CipherText encryptedData={playlist.name} />
                                                                                            <span className="ml-auto text-xs opacity-60">{playlist.videoIds.length}</span>
                                                                                        </DropdownMenuCheckboxItem>
                                                                                    ))}
                                                                                    <DropdownMenuSeparator />
                                                                                    <DropdownMenuItem>New Playlist</DropdownMenuItem>
                                                                                </DropdownMenuSubContent>
                                                                            </DropdownMenuPortal>
                                                                        </DropdownMenuSub>
                                                                        <DropdownMenuItem>Details</DropdownMenuItem>
                                                                    </DropdownMenuGroup>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuGroup>
                                                                        <DropdownMenuItem>Delete</DropdownMenuItem>
                                                                    </DropdownMenuGroup>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            {filteredVideos.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 items-center text-gray-400 py-24">
                                    <IconMoodPuzzled size={48} stroke={1.5} />
                                    <p>No videos found in this playlist.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>

                    <a href="/upload" className="fixed bottom-8 right-8 p-4 rounded-full border border-gray-200 bg-white shadow-sm">
                        <IconUpload />
                    </a>
                </div>
            </AnimatePresence>
        </div>
    );
};

export default VideoDashboard;
