"use client";

import { useEffect, useMemo, useState } from "react";

import { IconDotsVertical, IconFolders, IconHelpCircle, IconMoodPuzzled, IconPlus, IconUpload, IconUserCircle, IconVideo } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import { addVideoToPlaylist, createPlaylist, getPlaylists, getVideos, type Playlist, removeVideoFromPlaylist, type Video } from "@/actions/media";
import { decryptMetadata, encryptMetadata } from "@/cipher/block";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CipherText from "./CipherText";

type DecryptedVideo = Video & { decryptedName: string };

// biome-ignore lint/correctness/noUnusedFunctionParameters: ignore here
const VideoDashboard = ({ contentKey, metadataKey }: { contentKey: CryptoKey; metadataKey: CryptoKey }) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [decryptedVideos, setDecryptedVideos] = useState<DecryptedVideo[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [videosData, playlistsData] = await Promise.all([getVideos(), getPlaylists()]);
                setVideos(videosData);
                setPlaylists(playlistsData);
            } catch (error) {
                console.error("Failed to fetch media data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

    if (loading) return <div className="text-center p-12 text-gray-500 animate-pulse">Loading media...</div>;

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
                                                <div key={video._id.toString()} className="flex justify-between gap-3 items-center bg-white p-4 rounded-xl border border-gray-200 group transition-colors hover:border-gray-300">
                                                    <a href={`/player/${video._id}`} className="flex gap-3 items-center overflow-hidden">
                                                        <div className="p-2 bg-gray-50 rounded-lg text-gray-500 group-hover:text-black transition-all duration-300 shrink-0">
                                                            <IconVideo size={20} />
                                                        </div>
                                                        {/* DO NOT REMOVE min-w-0: Stupid WebKit won't break lines without it ¯\_(ツ)_/¯¯ */}
                                                        <span className="min-w-0 overflow-hidden font-medium text-gray-700 group-hover:text-black wrap-break-word flex-1">{video.decryptedName}</span>
                                                    </a>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button type="button" className="flex cursor-pointer p-2 rounded-md hover:bg-gray-100">
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
