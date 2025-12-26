"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { IconCpu, IconKey } from "@tabler/icons-react";

import { type EncryptedKeys, savePasswordEncryptedKey } from "@/actions/keyring";
import { deriveKekFromPassword } from "@/cipher/derive";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/cipher/helper";

const KEY_STORAGE_ID = "TWILIGHT_CEK";

const FullScreenModal = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50">
        <div className="p-6 max-w-3xl w-full border border-gray-200 bg-white rounded-lg">{children}</div>
    </div>
);

interface CipherGuardProps<T extends object> {
    encryptedKeys: EncryptedKeys | null;
    Component: React.ComponentType<{ contentKey: CryptoKey } & T>;
    componentProps: T;
    children: React.ReactNode;
}

const CipherGuard = <T extends object>({ encryptedKeys, Component, componentProps, children }: CipherGuardProps<T>) => {
    const [status, setStatus] = useState<"loading" | "needs_generation" | "needs_decryption" | "ready" | "error">("loading");
    const [error, setError] = useState<string | null>(null);
    const [useHardware, setUseHardware] = useState(false);
    const [password, setPassword] = useState("");
    const [contentKey, setContentKey] = useState<CryptoKey | null>(null);

    const init = async (hasEcnryptedKeys: boolean) => {
        const savedKey = localStorage.getItem(KEY_STORAGE_ID);
        if (savedKey) {
            try {
                const jwk = JSON.parse(savedKey);
                const key = await crypto.subtle.importKey("jwk", jwk, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);
                setContentKey(key);
                setStatus("ready");
                return;
            } catch (e) {
                localStorage.removeItem(KEY_STORAGE_ID);
            }
        }

        if (!hasEcnryptedKeys) {
            setStatus("needs_generation");
        } else {
            setStatus("needs_decryption");
        }
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: ignore here
    useEffect(() => {
        init(!!encryptedKeys);
    }, [encryptedKeys]);

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
            // Using AES-CTR for CEK
            const newContentKey = await crypto.subtle.generateKey({ name: "AES-CTR", length: 256 }, true, ["encrypt", "decrypt"]);
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const kek = await deriveKekFromPassword(password, salt);
            const iv = crypto.getRandomValues(new Uint8Array(16));
            const rawContentKey = await crypto.subtle.exportKey("raw", newContentKey);

            const ciphertext = await crypto.subtle.encrypt(
                {
                    // Using AES-GCM for KEK
                    name: "AES-GCM",
                    iv: iv,
                },
                kek,
                rawContentKey,
            );

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
            setError("Key generation failed.");
            setStatus("error");
        }
    };

    const handlePasswordDecrypt = async () => {
        if (!encryptedKeys?.passwordEncryptedKey) return;
        setStatus("loading");
        setError(null);

        try {
            const { salt, iv, ciphertext } = encryptedKeys.passwordEncryptedKey;
            const kek = await deriveKekFromPassword(password, new Uint8Array(base64ToArrayBuffer(salt)));

            const decryptedCEK = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(base64ToArrayBuffer(iv)),
                },
                kek,
                base64ToArrayBuffer(ciphertext),
            );

            const importedCEK = await crypto.subtle.importKey("raw", decryptedCEK, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);

            await saveKeyToLocalStorage(importedCEK);
            setContentKey(importedCEK);
            setStatus("ready");
        } catch (e) {
            console.error(e);
            setError("Incorrect password.");
            setStatus("needs_decryption");
        }
    };

    const renderModalContent = () => {
        if (status === "loading") return <p className="text-center py-4">Processing encryption...</p>;
        if (status === "error")
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="mb-4">{error}</p>
                    <button type="button" onClick={() => window.location.reload()} className="underline">
                        Retry
                    </button>
                </div>
            );

        if (status === "needs_generation")
            return (
                <div>
                    <h2 className="text-2xl font-bold mb-2">Setup Encryption</h2>
                    <p className="mb-6 text-gray-600 text-sm">Set a password to protect your media keys. This cannot be recovered.</p>
                    <input type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-md mb-4 outline-none focus:ring-1" />
                    {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                    <div className="flex justify-end">
                        <button type="button" onClick={handleGenerateKey} disabled={password.length < 8} className="bg-black text-white px-6 py-2 rounded-md disabled:opacity-50">
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
                        <input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePasswordDecrypt()} className="w-full p-3 border rounded-md mb-4 outline-none focus:ring-1" />
                    ) : (
                        <div className="flex flex-col justify-center items-center p-4">
                            <div className="flex gap-4">
                                <IconCpu size={32} />
                                <div className="flex space-x-2 justify-center items-center">
                                    <span className="sr-only">Loading...</span>
                                    <div className="h-1.5 w-1.5  bg-black rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-1.5 w-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-1.5 w-1.5 bg-black rounded-full animate-bounce"></div>
                                </div>
                                <IconKey size={32} />
                            </div>
                            <p className="mt-3 mb-4">Waiting for WebAuthn...</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                    <div className="flex justify-between items-center">
                        <button type="button" onClick={() => setUseHardware(!useHardware)} className="text-sm text-gray-500 hover:underline">
                            {useHardware ? "Use Password" : "Use Passkey (WebAuthn)"}
                        </button>
                        {!useHardware && (
                            <button type="button" onClick={handlePasswordDecrypt} className="bg-black text-white px-6 py-2 rounded-md">
                                Decrypt
                            </button>
                        )}
                    </div>
                </div>
            );
        return null;
    };

    return (
        <div id="cipher-guard">
            <div id="cipher-skeleton" className={status === "loading" ? "loading" : "hidden"}>
                {children}
            </div>
            {status !== "loading" && status !== "ready" && <FullScreenModal>{renderModalContent()}</FullScreenModal>}
            {status === "ready" && contentKey && (
                <div id="cipher-content">
                    <Component contentKey={contentKey} {...componentProps} />
                </div>
            )}
        </div>
    );
};

export default CipherGuard;
