import { describe, expect, it } from "vitest";

import { generateCEK } from "@/cipher/key";
import { createDecryptStream, createEncryptTransformStream } from "@/cipher/stream";

const testKey = await generateCEK();

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.byteLength;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}

function createChunkedStream(data: Uint8Array, chunkSize: number): ReadableStream<Uint8Array> {
    let offset = 0;
    return new ReadableStream({
        pull(controller) {
            if (offset >= data.length) {
                controller.close();
                return;
            }
            const end = Math.min(offset + chunkSize, data.length);
            controller.enqueue(data.slice(offset, end));
            offset = end;
        },
    });
}

function generateRandomBytes(size: number): Uint8Array {
    const buf = new Uint8Array(size);
    crypto.getRandomValues(buf);
    return buf;
}

describe("Crypto Streams", () => {
    const IV_SIZE = 16;

    it("should encrypt and decrypt correctly (Round Trip)", async () => {
        const originalData = new TextEncoder().encode("Hello World, AES-CTR Stream!");

        const { encryptTransform, counterBlock } = await createEncryptTransformStream(testKey);
        const inputStream = new ReadableStream({
            start(c) {
                c.enqueue(originalData);
                c.close();
            },
        });
        const encryptedStream = inputStream.pipeThrough(encryptTransform);
        const encryptedData = await streamToBuffer(encryptedStream);

        const storedData = new Uint8Array(IV_SIZE + encryptedData.length);
        storedData.set(counterBlock, 0);
        storedData.set(encryptedData, IV_SIZE);

        const sourceStream = new ReadableStream({
            start(c) {
                c.enqueue(storedData);
                c.close();
            },
        });

        const decryptStream = await createDecryptStream(testKey, sourceStream.getReader());
        const decryptedData = await streamToBuffer(decryptStream);

        expect(new TextDecoder().decode(decryptedData)).toBe("Hello World, AES-CTR Stream!");
    });

    it("should handle small chunks (Fragmentation Test)", async () => {
        const originalData = generateRandomBytes(100);

        const { encryptTransform, counterBlock } = await createEncryptTransformStream(testKey);
        const writer = encryptTransform.writable.getWriter();
        writer.write(originalData);
        writer.close();
        const encryptedData = await streamToBuffer(encryptTransform.readable);

        const storedData = new Uint8Array(IV_SIZE + encryptedData.length);
        storedData.set(counterBlock, 0);
        storedData.set(encryptedData, IV_SIZE);

        const chunkedSource = createChunkedStream(storedData, 1);

        const decryptStream = await createDecryptStream(testKey, chunkedSource.getReader());
        const result = await streamToBuffer(decryptStream);

        expect(result).toEqual(originalData);
    });

    it("should handle boundary crossing (Split IV)", async () => {
        const originalData = generateRandomBytes(50);

        const { encryptTransform, counterBlock } = await createEncryptTransformStream(testKey);
        const writer = encryptTransform.writable.getWriter();
        writer.write(originalData);
        writer.close();
        const encryptedData = await streamToBuffer(encryptTransform.readable);

        const storedData = new Uint8Array(IV_SIZE + encryptedData.length);
        storedData.set(counterBlock, 0);
        storedData.set(encryptedData, IV_SIZE);

        const chunkedSource = createChunkedStream(storedData, 10);

        const decryptStream = await createDecryptStream(testKey, chunkedSource.getReader());
        const result = await streamToBuffer(decryptStream);

        expect(result).toEqual(originalData);
    });

    it("should handle large chunks (IV and Data in one chunk)", async () => {
        const originalData = generateRandomBytes(50);

        const { encryptTransform, counterBlock } = await createEncryptTransformStream(testKey);
        const writer = encryptTransform.writable.getWriter();
        writer.write(originalData);
        writer.close();
        const encryptedData = await streamToBuffer(encryptTransform.readable);

        const storedData = new Uint8Array(IV_SIZE + encryptedData.length);
        storedData.set(counterBlock, 0);
        storedData.set(encryptedData, IV_SIZE);

        const singleChunkStream = createChunkedStream(storedData, storedData.length);

        const decryptStream = await createDecryptStream(testKey, singleChunkStream.getReader());
        const result = await streamToBuffer(decryptStream);

        expect(result).toEqual(originalData);
    });

    it("should close correctly if stream ends before full IV", async () => {
        const brokenData = new Uint8Array([1, 2, 3]);

        const sourceStream = new ReadableStream({
            start(c) {
                c.enqueue(brokenData);
                c.close();
            },
        });

        const decryptStream = await createDecryptStream(testKey, sourceStream.getReader());
        const result = await streamToBuffer(decryptStream);

        expect(result.length).toBe(0);
    });
});

describe("Encryption Stream Buffering Logic", () => {
    it("should encrypt correctly when input is fragmented into 1-byte chunks", async () => {
        const inputData = new Uint8Array(32).map((_, i) => i);

        const { encryptTransform } = await createEncryptTransformStream(testKey);

        const fragmentedSource = createChunkedStream(inputData, 1);
        const outputStream = fragmentedSource.pipeThrough(encryptTransform);
        const result = await streamToBuffer(outputStream);

        expect(result.length).toBe(32);
    });

    it("should encrypt correctly with irregular chunk sizes (e.g., 10 bytes)", async () => {
        const inputData = new Uint8Array(50).fill(123);

        const { encryptTransform } = await createEncryptTransformStream(testKey);

        const chunkedSource = createChunkedStream(inputData, 10);
        const outputStream = chunkedSource.pipeThrough(encryptTransform);
        const result = await streamToBuffer(outputStream);

        expect(result.length).toBe(50);
    });

    it("should handle flush correctly (data length is not multiple of 16)", async () => {
        const inputData = new Uint8Array(17).fill(255);

        const { encryptTransform } = await createEncryptTransformStream(testKey);

        const chunkedSource = createChunkedStream(inputData, 5);
        const outputStream = chunkedSource.pipeThrough(encryptTransform);
        const result = await streamToBuffer(outputStream);

        expect(result.length).toBe(17);
    });
});
