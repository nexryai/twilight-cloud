"use client";

import { useEffect, useState } from "react";

import { TbCpu, TbKey, TbUserCircle } from "react-icons/tb";

import { getKeys, type Keys, savePasswordEncryptedKey } from "@/actions/keyring";


/**
 * ArrayBufferをBase64文字列に変換する
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Base64文字列をArrayBufferに変換する
 */
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
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
}


const KEY_STORAGE_ID = "TWILIGHT_CEK";

const notes = [
    {
        id: "1",
        title: "First Note",
        content: "This is the content of the first note.",
        updatedAt: new Date(),
    },
];

const FullScreenModal = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50">
        <div className="p-6 max-w-3xl w-full bg-white rounded-lg shadow-2xl border">{children}</div>
    </div>
);

const NoteCard = ({ title, content, updatedAt }: { title: string; content: string; updatedAt: Date }) => (
    <div className="bg-white shadow-md rounded-md p-4 hover:shadow-lg transition-shadow duration-300 hover:cursor-pointer">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{content}</p>
        <span className="text-sm text-gray-400">Last updated: {updatedAt.toLocaleDateString()}</span>
    </div>
);

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
                    const key = await crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
                    setContentKey(key);
                    setStatus("ready");
                    return;
                } catch (e) {
                    console.error("Failed to import key from localStorage", e);
                    localStorage.removeItem(KEY_STORAGE_ID);
                }
            }

            // ローカルにない場合、サーバーから暗号化された鍵を取得
            try {
                const keys = await getKeys();
                if (!keys) {
                    setStatus("needs_generation");
                } else {
                    setKeyRing(keys);
                    setStatus("needs_decryption");
                }
            } catch (e) {
                console.error(e);
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
            // CEC生成
            const newContentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

            // PBKDF2用のSaltを生成
            const salt = crypto.getRandomValues(new Uint8Array(16));

            // ユーザー入力パスワードからKEKを導出
            const kek = await deriveKekFromPassword(password, salt);

            // KEKを使用してCECを暗号化
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const rawContentKey = await crypto.subtle.exportKey("raw", newContentKey);
            const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, kek, rawContentKey);

            await savePasswordEncryptedKey({
                salt: arrayBufferToBase64(salt.buffer),
                iv: arrayBufferToBase64(iv.buffer),
                ciphertext: arrayBufferToBase64(ciphertext),
            });

            await saveKeyToLocalStorage(newContentKey);
            setContentKey(newContentKey);
            setStatus("ready");
        } catch (e) {
            console.error(e);
            setError("An unexpected error occurred during key generation.");
            setStatus("error");
        }
    };

    const handlePasswordDecrypt = async () => {
        if (!keyRing?.passwordEncryptedKey) {
            setError("No password-encrypted key found.");
            return;
        }
        setStatus("loading");
        setError(null);

        try {
            const { salt, iv, ciphertext } = keyRing.passwordEncryptedKey;
            const saltBuffer = new Uint8Array(base64ToArrayBuffer(salt));
            const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
            const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

            const kek = await deriveKekFromPassword(password, saltBuffer);

            const decryptedKeyRaw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, kek, ciphertextBuffer);

            const importedKey = await crypto.subtle.importKey("raw", decryptedKeyRaw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);

            await saveKeyToLocalStorage(importedKey);
            setContentKey(importedKey);
            setStatus("ready");
        } catch (e) {
            console.error(e);
            setError("Incorrect password or decryption failed.");
            setStatus("needs_decryption");
        }
    };

    const handleWebAuthnDecrypt = () => {
        alert("WebAuthn PRF is not yet implemented.");
    };

    const renderModalContent = () => {
        if (status === "loading") return <p className="text-center py-4">Processing...</p>;
        if (status === "error") {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 text-red-600">Error</h2>
                    <p className="mb-4">{error}</p>
                    <button type="button" onClick={() => window.location.reload()} className="text-blue-600 underline">
                        Retry
                    </button>
                </div>
            );
        }
        if (status === "needs_generation") {
            return (
                <div>
                    <h2 className="text-2xl font-bold mb-2">Setup Encryption</h2>
                    <p className="mb-6 text-gray-600">Please set a strong password. This password will protect your encryption key. We cannot recover this password for you.</p>
                    <input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-md mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
                    {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                    <div className="flex justify-end">
                        <button type="button" onClick={handleGenerateKey} disabled={password.length < 8} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
                            Create Key
                        </button>
                    </div>
                </div>
            );
        }
        if (status === "needs_decryption") {
            return (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Decrypt Access</h2>
                    <p className="mb-6 text-gray-600">Enter your password to access your encrypted notes.</p>
                    {!useHardware ? (
                        <input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePasswordDecrypt()} className="w-full p-3 border rounded-md mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                        <div className="flex flex-col items-center p-8 border-2 border-dashed rounded-lg mb-4">
                            <button type="button" onClick={handleWebAuthnDecrypt} className="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-full hover:bg-gray-100 transition-colors">
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
                            <button type="button" onClick={handlePasswordDecrypt} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                                Decrypt
                            </button>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans">
            {status !== "ready" && <FullScreenModal>{renderModalContent()}</FullScreenModal>}

            <div className="flex-1">
                <nav className="fixed top-0 left-0 w-full h-12 flex items-center justify-between px-6 z-40 bg-white/80 backdrop-blur-sm border-b">
                    <span className="font-bold">Twilight Cloud</span>
                    <TbUserCircle size={24} className="text-gray-600 cursor-pointer" />
                </nav>

                <div className="flex justify-between bg-[#f7f7f7] w-full h-64 mt-12">
                    <div className="flex items-center ml-16">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl font-bold">My Documents</h1>
                            <p className="text-gray-500">{notes.length} Secured Notes</p>
                        </div>
                    </div>
                    <img src="/eve-M-rtWw1OlnQ-unsplash.jpg" alt="Hero" className="h-64 w-1/3 object-cover" />
                </div>

                <main className="max-w-7xl mx-auto px-6 py-12">
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {notes.map((note) => (
                            <NoteCard key={note.id} {...note} />
                        ))}
                    </div>
                </main>
            </div>

            <footer className="h-24 px-6 border-t flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
                <p>&copy; {new Date().getFullYear()} nexryai. All rights reserved.</p>
                <p>Project of Ablaze</p>
            </footer>
        </div>
    );
}
