"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { TbArrowLeft, TbCpu, TbKey, TbPlus, TbUpload, TbUserCircle } from "react-icons/tb";

import { getKeys, type Keys, savePasswordEncryptedKey } from "@/actions/keyring";
import { createPlaylist, getPlaylists, getVideos, type Playlist, type Video } from "@/actions/media";

const Uploader = dynamic(() => import("@/components/VideoUploader"), {
    ssr: false,
    loading: () => <p className="text-center p-12 text-gray-500">Loading uploader...</p>,
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

async function deriveKekFromPassword(password: string, salt: BufferSource): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        passwordKey,
        { name: "AES-CTR", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}

const KEY_STORAGE_ID = "TWILIGHT_CEK";

const FullScreenModal = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50">
        <div className="p-6 max-w-3xl w-full bg-white/50 rounded-lg">{children}</div>
    </div>
);

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
                    <button type="button" onClick={() => setShowUploader(!showUploader)} className="flex items-center gap-2 rounded-full px-5 py-2 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer transition-colors shadow-sm">
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
                                            <h3 className="text-xl font-bold mt-8 mb-4 border-b pb-2">{letter}</h3>
                                            <ul className="space-y-3">
                                                {vids.map((video) => (
                                                    <motion.li layout key={video._id.toString()} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="bg-white p-3 rounded-md shadow-sm hover:bg-gray-50 transition-colors border border-gray-100">
                                                        {video.name}
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default function Home() {
    const [status, setStatus] = useState<"loading" | "needs_generation" | "needs_decryption" | "ready" | "error">("loading");
    const [error, setError] = useState<string | null>(null);
    const [useHardware, setUseHardware] = useState(false);
    const [password, setPassword] = useState("");
    const [contentKey, setContentKey] = useState<CryptoKey | null>(null);
    const [keyRing, setKeyRing] = useState<Keys | null>(null);

    useEffect(() => {
        const init = async () => {
            const savedKey = localStorage.getItem(KEY_STORAGE_ID);
            if (savedKey) {
                try {
                    const jwk = JSON.parse(savedKey);
                    const key = await crypto.subtle.importKey("jwk", jwk, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);
                    setContentKey(key);
                    setStatus("ready");
                    return;
                } catch (e) {
                    console.error("Local key invalid", e);
                    localStorage.removeItem(KEY_STORAGE_ID);
                }
            }

            try {
                const keys = await getKeys();
                if (!keys) {
                    setStatus("needs_generation");
                } else {
                    setKeyRing(keys);
                    setStatus("needs_decryption");
                }
            } catch (e) {
                setError("Could not connect to the server.");
                setStatus("error");
            }
        };
        init();
    }, []);

    const saveKeyToLocalStorage = async (key: CryptoKey) => {
        const jwk = await crypto.subtle.exportKey("jwk", key);
        localStorage.setItem(KEY_STORAGE_ID, JSON.stringify(jwk));
    };

    const handleGenerateKey = async () => {
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        setStatus("loading");
        setError(null);

        try {
            // Content Key (AES-CTR)
            const newContentKey = await crypto.subtle.generateKey({ name: "AES-CTR", length: 256 }, true, ["encrypt", "decrypt"]);

            const salt = crypto.getRandomValues(new Uint8Array(16));
            const kek = await deriveKekFromPassword(password, salt);

            // --- 修正: CTRカウンターは必ず16バイト ---
            const counter = crypto.getRandomValues(new Uint8Array(16));
            const rawContentKey = await crypto.subtle.exportKey("raw", newContentKey);

            // --- 修正: counter プロパティと length プロパティを指定 ---
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: "AES-CTR",
                    counter: counter,
                    length: 64, // カウンターの増分ビット数
                },
                kek,
                rawContentKey,
            );

            await savePasswordEncryptedKey({
                salt: arrayBufferToBase64(salt.buffer),
                iv: arrayBufferToBase64(counter.buffer), // カウンターを保存
                ciphertext: arrayBufferToBase64(ciphertext),
            });

            await saveKeyToLocalStorage(newContentKey);
            setContentKey(newContentKey);
            setStatus("ready");
        } catch (e) {
            console.error(e);
            setError("Key generation failed.");
            setStatus("error");
        }
    };

    const handlePasswordDecrypt = async () => {
        if (!keyRing?.passwordEncryptedKey) return;
        setStatus("loading");
        setError(null);

        try {
            const { salt, iv, ciphertext } = keyRing.passwordEncryptedKey;
            const kek = await deriveKekFromPassword(password, new Uint8Array(base64ToArrayBuffer(salt)));

            // --- 修正: 復号時も AES-CTR パラメータを指定 ---
            const decryptedKeyRaw = await crypto.subtle.decrypt(
                {
                    name: "AES-CTR",
                    counter: new Uint8Array(base64ToArrayBuffer(iv)),
                    length: 64,
                },
                kek,
                base64ToArrayBuffer(ciphertext),
            );

            // --- 修正: AES-CTR としてインポート ---
            const importedKey = await crypto.subtle.importKey("raw", decryptedKeyRaw, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);

            await saveKeyToLocalStorage(importedKey);
            setContentKey(importedKey);
            setStatus("ready");
        } catch (e) {
            console.error(e);
            setError("Incorrect password.");
            setStatus("needs_decryption");
        }
    };

    // ... (renderModalContent, return JSX 部分は変更なし)
    const renderModalContent = () => {
        if (status === "loading") return <p className="text-center py-4">Processing encryption...</p>;
        if (status === "error")
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="mb-4">{error}</p>
                    <button type="button" onClick={() => window.location.reload()} className="text-blue-600 underline">
                        Retry
                    </button>
                </div>
            );

        if (status === "needs_generation")
            return (
                <div>
                    <h2 className="text-2xl font-bold mb-2">Setup Encryption</h2>
                    <p className="mb-6 text-gray-600 text-sm">Set a password to protect your media keys. This cannot be recovered.</p>
                    <input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-md mb-4 outline-none focus:ring-2 focus:ring-blue-500" />
                    {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                    <div className="flex justify-end">
                        <button type="button" onClick={handleGenerateKey} disabled={password.length < 8} className="bg-blue-600 text-white px-6 py-2 rounded-md disabled:opacity-50">
                            Create Key
                        </button>
                    </div>
                </div>
            );

        if (status === "needs_decryption")
            return (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Decrypt Access</h2>
                    {!useHardware ? (
                        <input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePasswordDecrypt()} className="w-full p-3 border rounded-md mb-4 outline-none focus:ring-2 focus:ring-blue-500" />
                    ) : (
                        <div className="flex flex-col items-center p-8 border-2 border-dashed rounded-lg mb-4">
                            <button type="button" onClick={() => alert("WebAuthn PRF required")} className="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-full hover:bg-gray-100">
                                <TbCpu size={24} /> <span>Use Hardware Key</span> <TbKey size={24} />
                            </button>
                        </div>
                    )}
                    {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                    <div className="flex justify-between items-center">
                        <button type="button" onClick={() => setUseHardware(!useHardware)} className="text-sm text-gray-500 hover:underline">
                            {useHardware ? "Use Password" : "Use Passkey (WebAuthn)"}
                        </button>
                        {!useHardware && (
                            <button type="button" onClick={handlePasswordDecrypt} className="bg-blue-600 text-white px-6 py-2 rounded-md">
                                Decrypt
                            </button>
                        )}
                    </div>
                </div>
            );
        return null;
    };

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-neutral-900">
            {status !== "ready" && <FullScreenModal>{renderModalContent()}</FullScreenModal>}
            <div className="flex-1">
                <div className="fixed top-0 left-0 z-50 w-screen h-12">{/* ナビゲーションバー */}</div>
                <div className="bg-[#f7f7f7] w-full h-64 flex justify-between">
                    <div className="flex items-center ml-16">
                        <div className="flex flex-col gap-4">
                            <h1 className="text-2xl font-bold">My Videos</h1>
                            <p>Manage your library</p>
                        </div>
                    </div>
                    <img src="/eve-M-rtWw1OlnQ-unsplash.jpg" alt="bg" className="h-64 w-auto object-cover" />
                </div>
                <main className="pb-20">{status === "ready" && contentKey ? <VideoDashboard contentKey={contentKey} /> : <div className="p-20 text-center text-gray-400">Waiting for decryption...</div>}</main>
            </div>
            <footer className="border-t py-12 px-16 flex justify-between items-center text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} nexryai All rights reserved.</p>
                <p className="font-medium text-gray-400">Project of Ablaze</p>
            </footer>
        </div>
    );
}
