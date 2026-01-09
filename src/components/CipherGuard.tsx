"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { IconCpu, IconKey } from "@tabler/icons-react";

import { type EncryptedKeys, savePasswordEncryptedKey } from "@/actions/keyring";
import { decryptKey, encryptKey } from "@/cipher/block";
import { deriveKekFromPassword } from "@/cipher/derive";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/cipher/helper";
import { generateCEK, generateMEK } from "@/cipher/key";
import { useCipherKey } from "@/context/CipherContext";

const CEK_STORAGE_ID = "TWILIGHT_CEK";
const MEK_STORAGE_ID = "TWILIGHT_MEK";

const FullScreenModal = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50">
        <div className="p-6 max-w-3xl w-full border border-gray-200 bg-white rounded-lg">{children}</div>
    </div>
);

interface CipherGuardProps<T extends object> {
    encryptedKeys: EncryptedKeys | null;
    Component: React.ComponentType<{ contentKey: CryptoKey; metadataKey: CryptoKey } & T>;
    componentProps: T;
    children: React.ReactNode;
}

const CipherGuard = <T extends object>({ encryptedKeys, Component, componentProps, children }: CipherGuardProps<T>) => {
    const { setMetadataKey: setGlobalMetadataKey } = useCipherKey();
    const [status, setStatus] = useState<"loading" | "needs_generation" | "needs_decryption" | "ready" | "error">("loading");
    const [error, setError] = useState<string | null>(null);
    const [useHardware, setUseHardware] = useState(false);
    const [password, setPassword] = useState("");
    const [contentKey, setContentKey] = useState<CryptoKey | null>(null);
    const [metadataKey, setMetadataKey] = useState<CryptoKey | null>(null);

    const init = async (hasEncryptedKeys: boolean) => {
        const savedCEK = localStorage.getItem(CEK_STORAGE_ID);
        const savedMEK = localStorage.getItem(MEK_STORAGE_ID);

        if (savedCEK && savedMEK) {
            try {
                const cekJwk = JSON.parse(savedCEK);
                const cek = await crypto.subtle.importKey("jwk", cekJwk, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);
                setContentKey(cek);

                const mekJwk = JSON.parse(savedMEK);
                const mek = await crypto.subtle.importKey("jwk", mekJwk, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
                setMetadataKey(mek);
                setGlobalMetadataKey(mek);

                setStatus("ready");
                return;
            } catch (e) {
                console.error(e);
                localStorage.removeItem(CEK_STORAGE_ID);
                localStorage.removeItem(MEK_STORAGE_ID);
            }
        }

        if (!hasEncryptedKeys) {
            setStatus("needs_generation");
        } else {
            setStatus("needs_decryption");
        }
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: Ignore here
    useEffect(() => {
        init(!!encryptedKeys);
    }, [encryptedKeys]);

    const saveKeyToLocalStorage = async (key: CryptoKey, id: string) => {
        const jwk = await crypto.subtle.exportKey("jwk", key);
        localStorage.setItem(id, JSON.stringify(jwk));
    };

    const handleGenerateKey = async () => {
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }
        setStatus("loading");
        setError(null);

        try {
            const newContentKey = await generateCEK();
            const newMetadataKey = await generateMEK();

            const salt = crypto.getRandomValues(new Uint8Array(16));
            const kek = await deriveKekFromPassword(password, salt);

            const encryptedCEK = await encryptKey(newContentKey, kek);
            const encryptedMEK = await encryptKey(newMetadataKey, kek);

            await savePasswordEncryptedKey(
                {
                    salt: arrayBufferToBase64(salt.buffer),
                    iv: arrayBufferToBase64(encryptedCEK.iv.buffer),
                    ciphertext: arrayBufferToBase64(encryptedCEK.ciphertext),
                },
                "CEK",
            );

            await savePasswordEncryptedKey(
                {
                    salt: arrayBufferToBase64(salt.buffer),
                    iv: arrayBufferToBase64(encryptedMEK.iv.buffer),
                    ciphertext: arrayBufferToBase64(encryptedMEK.ciphertext),
                },
                "MEK",
            );

            await saveKeyToLocalStorage(newContentKey, CEK_STORAGE_ID);
            await saveKeyToLocalStorage(newMetadataKey, MEK_STORAGE_ID);

            setContentKey(newContentKey);
            setMetadataKey(newMetadataKey);
            setGlobalMetadataKey(newMetadataKey);
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

            const decryptedCEK = await decryptKey(base64ToArrayBuffer(ciphertext), new Uint8Array(base64ToArrayBuffer(iv)), kek);
            await saveKeyToLocalStorage(decryptedCEK, CEK_STORAGE_ID);
            setContentKey(decryptedCEK);

            if (encryptedKeys.passwordEncryptedMetadataKey) {
                const mData = encryptedKeys.passwordEncryptedMetadataKey;
                const decryptedMEK = await decryptKey(base64ToArrayBuffer(mData.ciphertext), new Uint8Array(base64ToArrayBuffer(mData.iv)), kek, "AES-GCM");

                await saveKeyToLocalStorage(decryptedMEK, MEK_STORAGE_ID);
                setMetadataKey(decryptedMEK);
                setGlobalMetadataKey(decryptedMEK);
            } else {
                const newMetadataKey = await generateMEK();
                const encryptedMEK = await encryptKey(newMetadataKey, kek);

                await savePasswordEncryptedKey(
                    {
                        salt: salt,
                        iv: arrayBufferToBase64(encryptedMEK.iv.buffer),
                        ciphertext: arrayBufferToBase64(encryptedMEK.ciphertext),
                    },
                    "MEK",
                );

                await saveKeyToLocalStorage(newMetadataKey, MEK_STORAGE_ID);
                setMetadataKey(newMetadataKey);
                setGlobalMetadataKey(newMetadataKey);
            }

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
            {status === "ready" && contentKey && metadataKey && (
                <div id="cipher-content">
                    <Component contentKey={contentKey} metadataKey={metadataKey} {...componentProps} />
                </div>
            )}
        </div>
    );
};

export default CipherGuard;
