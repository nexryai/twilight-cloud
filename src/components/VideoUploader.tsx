"use client";

import type React from "react";
import { useState } from "react";

import { remuxToDash } from "ikaria.js";

import { getPresignedUrls } from "@/actions/upload";
import { generateRandomIV } from "@/cipher/key";
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
    const [statusMessage, setStatusMessage] = useState<string>("ファイルを選択してください");
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
        setStatusMessage("OPFSへ書き込み中...");
        setUploadProgress(0);

        try {
            const opfsRoot = await navigator.storage.getDirectory();

            const fileHandle = await opfsRoot.getFileHandle(selectedFile.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(selectedFile);
            await writable.close();

            setStatusMessage("DASHへ変換中...");
            await runConversion(selectedFile.name);
            const outDir = await opfsRoot.getDirectoryHandle("out");
            const fileList: string[] = [];
            // @ts-expect-error - FileSystemDirectoryHandle iteration
            for await (const name of outDir.keys()) {
                fileList.push(name);
            }

            const { urls, manifestPath } = await getPresignedUrls(fileList, selectedFile.type, selectedFile.name);

            // --- 3. 総ファイルサイズ計算 (データ本体 + カウンター16バイト) ---
            const sizes = await Promise.all(
                fileList.map(async (name) => {
                    const fileHandle = await outDir.getFileHandle(name);
                    const file = await fileHandle.getFile();
                    return file.size + 16;
                }),
            );
            const totalSize = sizes.reduce((acc, size) => acc + size, 0);
            let totalUploadedSize = 0;

            for (const { url, filename } of urls) {
                const uploadWithRetry = async (retryCount: number): Promise<void> => {
                    const fileHandle = await outDir.getFileHandle(filename);
                    const file = await fileHandle.getFile();

                    const counterBlock = generateRandomIV();

                    setStatusMessage(`暗号化準備中: ${filename}`);

                    // 暗号化ストリームの作成
                    const encryptTransform = await createCryptoTransformStream(contentKey, counterBlock);

                    const encryptedChunks: Uint8Array[] = [counterBlock];

                    const reader = file.stream().pipeThrough(encryptTransform).getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        encryptedChunks.push(value);
                    }

                    const uploadBlob = new Blob(encryptedChunks as BlobPart[], { type: "application/octet-stream" });

                    try {
                        setStatusMessage(`アップロード中: ${filename}`);

                        const response = await fetch(url, {
                            method: "PUT",
                            body: uploadBlob,
                        });

                        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

                        totalUploadedSize += file.size + 16;
                        setUploadProgress((totalUploadedSize / totalSize) * 100);
                    } catch (e) {
                        if (retryCount > 0) {
                            console.warn(`Retry ${filename}: ${retryCount} attempts left`);
                            return await uploadWithRetry(retryCount - 1);
                        }
                        throw e;
                    }
                };

                await uploadWithRetry(3);
            }
            setStatusMessage(`アップロード完了！ Manifest: ${manifestPath}`);
        } catch (error) {
            console.error("Processing Error:", error);
            setStatusMessage(`エラー: ${error instanceof Error ? error.message : error}`);
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
                    <span className={`text-sm ${isProcessing ? "text-blue-600 font-medium" : "text-gray-700"}`}>{statusMessage}</span>
                </div>
                {isProcessing && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <div className="text-right text-xs mt-1 text-gray-400 font-mono">{Math.round(uploadProgress)}%</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoUploader;
