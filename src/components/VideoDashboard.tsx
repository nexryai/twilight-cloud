"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { TbArrowLeft, TbMoodPuzzled, TbPlus, TbUpload, TbVideo } from "react-icons/tb";

import { createPlaylist, getPlaylists, getVideos, type Playlist, type Video } from "@/actions/media";

const Uploader = dynamic(() => import("@/components/VideoUploader"), {
    ssr: false,
    loading: () => <p className="text-center p-12 text-gray-500">Loading uploader...</p>,
});

const VideoDashboard = ({ contentKey }: { contentKey: CryptoKey }) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(true);
    const [showUploader, setShowUploader] = useState(false);

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

    const handleCreatePlaylist = async () => {
        const playlistName = prompt("Enter new playlist name:");
        if (playlistName) {
            try {
                await createPlaylist(playlistName);
                const playlistsData = await getPlaylists();
                setPlaylists(playlistsData);
            } catch (error) {
                console.error("Failed to create playlist", error);
            }
        }
    };

    const filteredVideos = useMemo(() => {
        if (!selectedPlaylist) return videos;
        const videoIdsInPlaylist = new Set(selectedPlaylist.videoIds.map((id) => id.toString()));
        return videos.filter((video) => videoIdsInPlaylist.has(video._id.toString()));
    }, [videos, selectedPlaylist]);

    const groupedVideos = useMemo(() => {
        return filteredVideos.reduce(
            (acc, video) => {
                const firstLetter = video.name?.[0]?.toUpperCase() ?? "#";
                if (!acc[firstLetter]) acc[firstLetter] = [];
                acc[firstLetter].push(video);
                return acc;
            },
            {} as Record<string, Video[]>,
        );
    }, [filteredVideos]);

    if (loading) return <div className="text-center p-12 text-gray-500 animate-pulse">Loading media...</div>;

    return (
        <div>
            <div className="px-16 pt-12">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                        <span className="text-2xl font-bold">{showUploader ? "Upload Media" : "Files"}</span>
                    </div>
                    <button type="button" onClick={() => setShowUploader(!showUploader)} className="flex items-center gap-2 rounded-full px-5 py-2 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer transition-colors">
                        {showUploader ? (
                            <>
                                <TbArrowLeft /> Back to Videos
                            </>
                        ) : (
                            <>
                                <TbUpload /> Upload
                            </>
                        )}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {showUploader ? (
                        <motion.div key="uploader" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="bg-white rounded-xl border border-gray-100 p-8">
                            <Uploader contentKey={contentKey} />
                        </motion.div>
                    ) : (
                        <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                            <div className="max-w-7xl mx-auto grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -4 }}
                                    onClick={() => setSelectedPlaylist(null)}
                                    className={`bg-white border border-gray-200 rounded-md p-4 transition-shadow cursor-pointer ${!selectedPlaylist ? "ring-2 ring-black" : ""}`}
                                >
                                    <h2 className="text-lg font-semibold mb-2">All Videos</h2>
                                    <p className="text-gray-600">{videos.length} videos</p>
                                </motion.div>

                                {playlists.map((playlist) => (
                                    <motion.div
                                        layout
                                        key={playlist._id.toString()}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -4 }}
                                        onClick={() => setSelectedPlaylist(playlist)}
                                        className={`bg-white border border-gray-200 rounded-md p-4 transition-shadow cursor-pointer ${selectedPlaylist?._id.toString() === playlist._id.toString() ? "ring-2 ring-black" : ""}`}
                                    >
                                        <h2 className="text-lg font-semibold mb-2">{playlist.name}</h2>
                                        <p className="text-gray-600">{playlist.videoIds.length} videos</p>
                                    </motion.div>
                                ))}

                                <motion.div layout whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreatePlaylist} className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-md p-4 cursor-pointer hover:bg-gray-200 transition-colors">
                                    <TbPlus size={32} className="text-gray-500" />
                                </motion.div>
                            </div>

                            <div className="pt-12">
                                <AnimatePresence mode="popLayout">
                                    {Object.entries(groupedVideos).map(([letter, vids]) => (
                                        <motion.div layout key={letter} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                            <h3 className="text-xl font-bold mt-8 mb-4 border-b border-gray-200 pb-2">{letter}</h3>
                                            <div className="space-y-3 flex flex-col">
                                                {vids.map((video) => (
                                                    <motion.a
                                                        href={`/player/${video._id}`}
                                                        layout
                                                        key={video._id.toString()}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        className="flex gap-2 items-center bg-white p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-200"
                                                    >
                                                        <TbVideo />
                                                        {video.name}
                                                    </motion.a>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {filteredVideos.length === 0 && (
                                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4 items-center text-gray-500 py-12 min-h-128">
                                            <TbMoodPuzzled size={32} />
                                            No videos found.
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default VideoDashboard;
