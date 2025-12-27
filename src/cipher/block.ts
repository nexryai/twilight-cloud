export async function encryptCEK(cek: CryptoKey, kek: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const exportedCEK = await crypto.subtle.exportKey("raw", cek);

    return {
        // Using AES-GCM for keys encryption
        ciphertext: await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, kek, exportedCEK),
        iv: iv,
    };
}

export async function decryptCEK(encryptedCek: ArrayBuffer, iv: Uint8Array<ArrayBuffer>, kek: CryptoKey): Promise<CryptoKey> {
    const decryptedCEK = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, kek, encryptedCek);

    return crypto.subtle.importKey("raw", decryptedCEK, { name: "AES-CTR" }, true, ["encrypt", "decrypt"]);
}
