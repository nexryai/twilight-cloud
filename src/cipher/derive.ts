import { argon2id } from "hash-wasm";

export async function deriveKekFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const hashUint8 = await argon2id({
        password: password,
        salt: salt,
        parallelism: 6,
        iterations: 16,
        memorySize: 128000, // 128MB
        hashLength: 32, // for AES-256
        outputType: "binary",
    });

    return crypto.subtle.importKey("raw", hashUint8 as Uint8Array<ArrayBuffer>, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
