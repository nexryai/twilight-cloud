"use client";

import type React from "react";
import { useState } from "react";

import { remuxToDash } from "ikaria.js";

import { createMedia, getChunkUploadUrl } from "@/actions/upload";
import { generateCounterBlock } from "@/cipher/counter";
import { createCryptoTransformStream } from "@/cipher/stream";

const requestPersistentStorage = async (): Promise<boolean> => {
    if (navigator.storage?.persist) {
        const isAlreadyPersisted = await navigator.storage.persisted();
        if (isAlreadyPersisted) return true;
        return await navigator.storage.persist();
    }

    return false;
};

const runConversion = async (fileName: string) => {
    await remuxToDash(`/opfs/${fileName}`);
};

interface VideoUploaderProps {
    contentKey: CryptoKey;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ contentKey }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>("Please select a file");
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (!(await requestPersistentStorage())) {
            console.warn("PersistentStorage is not allowed.");
        }

        const selectedFile = files[0];
        setIsProcessing(true);
        await clearOpfs();
        setStatusMessage("Writing to OPFS...");
        setUploadProgress(0);

        try {
            const opfsRoot = await navigator.storage.getDirectory();

            // Write source file to OPFS
            const fileHandle = await opfsRoot.getFileHandle(selectedFile.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(selectedFile);
            await writable.close();

            setStatusMessage("Converting to DASH...");
            await runConversion(selectedFile.name);

            const outDir = await opfsRoot.getDirectoryHandle("out");
            const fileList: string[] = [];
            // @ts-expect-error
            for await (const name of outDir.keys()) {
                fileList.push(name);
            }

            const manifestFilename = fileList.find((name) => name.endsWith(".mpd"));
            if (!manifestFilename) throw new Error("Manifest (.mpd) not found");

            // 1. Register media and get manifest upload URL
            setStatusMessage("Registering media...");
            const { mediaId, url: manifestUploadUrl } = await createMedia(manifestFilename, selectedFile.type, selectedFile.name);

            // 2. Calculate total size for progress tracking
            const sizes = await Promise.all(
                fileList.map(async (name) => {
                    const fileHandle = await outDir.getFileHandle(name);
                    const file = await fileHandle.getFile();
                    return file.size + 16;
                }),
            );
            const totalSize = sizes.reduce((acc, size) => acc + size, 0);
            let totalUploadedSize = 0;

            const encryptAndUpload = async (filename: string, uploadUrl: string) => {
                const fileHandle = await outDir.getFileHandle(filename);
                const file = await fileHandle.getFile();
                const counterBlock = generateCounterBlock();

                setStatusMessage(`Encrypting: ${filename}`);
                const encryptTransform = await createCryptoTransformStream(contentKey, counterBlock);
                const encryptedChunks: Uint8Array[] = [counterBlock];

                const reader = file.stream().pipeThrough(encryptTransform).getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    encryptedChunks.push(value);
                }

                const uploadBlob = new Blob(encryptedChunks as BlobPart[], { type: "application/octet-stream" });

                setStatusMessage(`Uploading: ${filename}`);
                const response = await fetch(uploadUrl, {
                    method: "PUT",
                    body: uploadBlob,
                    headers: { "Content-Type": "application/octet-stream" },
                });

                if (!response.ok) throw new Error(`Upload failed for ${filename}: ${response.status}`);

                totalUploadedSize += file.size + 16;
                setUploadProgress((totalUploadedSize / totalSize) * 100);
            };

            // 3. Upload Manifest
            await encryptAndUpload(manifestFilename, manifestUploadUrl);

            // 4. Upload Chunks
            const chunks = fileList.filter((name) => name !== manifestFilename);
            for (const filename of chunks) {
                const { url: chunkUrl } = await getChunkUploadUrl(mediaId, filename);
                await encryptAndUpload(filename, chunkUrl);
            }

            setStatusMessage(`Upload complete! Media ID: ${mediaId}`);
        } catch (error) {
            console.error("Processing Error:", error);
            setStatusMessage(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
        } finally {
            setIsProcessing(false);
            if (event.target) event.target.value = "";
        }
    };

    const clearOpfs = async () => {
        try {
            const root = await navigator.storage.getDirectory();
            // @ts-expect-error
            for await (const name of root.keys()) {
                await root.removeEntry(name, { recursive: true });
            }
        } catch (error) {
            console.error("Clear OPFS Error:", error);
        }
    };

    return (
        <div className="p-5 max-w-2xl mx-auto">
            <h1 className="text-xl font-bold mb-4 font-sans">DASH Video Uploader</h1>
            <div className="mb-5 p-4 border border-gray-200 rounded-lg shadow-sm">
                <input
                    type="file"
                    accept="video/webm,video/mp4"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 transition-colors cursor-pointer"
                />
                <div className="mt-4 flex items-center gap-2">
                    <strong className="text-sm">Status:</strong>
                    <span className={`text-sm ${isProcessing ? "text-gray-500 font-medium" : "text-gray-700"}`}>{statusMessage}</span>
                </div>
                {isProcessing && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-black h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="text-right text-xs mt-1 text-gray-400 font-mono">{Math.round(uploadProgress)}%</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoUploader;
