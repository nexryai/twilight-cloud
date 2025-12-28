export async function generateCEK(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        {
            name: "AES-CTR",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    );
}

export async function generateMEK(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    );
}
