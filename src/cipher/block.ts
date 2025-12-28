export async function encryptKey(key: CryptoKey, kek: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const exportedCEK = await crypto.subtle.exportKey("raw", key);

    return {
        ciphertext: await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, kek, exportedCEK),
        iv: iv,
    };
}

export async function decryptKey(encryptedKey: ArrayBuffer, iv: Uint8Array<ArrayBuffer>, kek: CryptoKey): Promise<CryptoKey> {
    const decryptedCEK = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, kek, encryptedKey);

    return crypto.subtle.importKey("raw", decryptedCEK, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);
}

export async function encryptMetadata(plaintext: string, mek: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, mek, encoded);

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
}

export async function decryptMetadata(hexOrBase64: string, mek: CryptoKey): Promise<string> {
    const combined = new Uint8Array(
        atob(hexOrBase64)
            .split("")
            .map((c) => c.charCodeAt(0)),
    );

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, mek, ciphertext);

    return new TextDecoder().decode(decrypted);
}
