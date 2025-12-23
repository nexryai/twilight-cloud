"use client";

import type React from "react";
import { useState } from "react";

import { remuxToDash } from "ikaria.js";

import { getPresignedUrls } from "@/actions/upload";

const requestPersistentStorage = async (): Promise<boolean> => {
    if (navigator.storage && navigator.storage.persist) {
        const isAlreadyPersisted = await navigator.storage.persisted();
        if (isAlreadyPersisted) {
            console.log("Storage is already persisted.");
            return true;
        }

        const isPersisted = await navigator.storage.persist();
        console.log(`Storage persistence granted: ${isPersisted}`);

        return isPersisted;
    } else {
        console.warn("StorageManager API is not supported in this browser.");
        return false;
    }
};

const VideoUploader: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>("ファイルを選択してください");
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (await !requestPersistentStorage()) {
            console.warn("PersistentStorage is not allowed.");
        }

        const selectedFile = files[0];
        setIsProcessing(true);
        setStatusMessage("OPFSへ書き込み中...");
        setUploadProgress(0);

        try {
            const opfsRoot = await navigator.storage.getDirectory();

            const fileHandle = await opfsRoot.getFileHandle(selectedFile.name, { create: true });

            const writable = await fileHandle.createWritable();
            await writable.write(selectedFile);
            await writable.close();

            console.log("Written to OPFS via JS");

            setStatusMessage("DASHへ変換中...");

            await remuxToDash(`/opfs/${selectedFile.name}`);

            setStatusMessage("変換完了。アップロード準備中...");

            const outDir = await opfsRoot.getDirectoryHandle("out");
            const fileList: string[] = [];
            // @ts-expect-error
            for await (const name of outDir.keys()) {
                if (name === "." || name === "..") {
                    continue;
                }

                fileList.push(name);
            }

            const { urls, manifestPath } = await getPresignedUrls(fileList, selectedFile.type);

            setStatusMessage("アップロード中...");

            const totalSize = (
                await Promise.all(
                    fileList.map(async (name) => {
                        const fileHandle = await outDir.getFileHandle(name);
                        const file = await fileHandle.getFile();
                        return file.size;
                    }),
                )
            ).reduce((acc, size) => acc + size, 0);

            let uploadedSize = 0;

            await Promise.all(
                urls.map(async ({ url, filename }) => {
                    const fileHandle = await outDir.getFileHandle(filename);
                    const file = await fileHandle.getFile();

                    const upload = async (retryCount: number): Promise<void> => {
                        try {
                            const response = await fetch(url, {
                                method: "PUT",
                                body: file,
                                headers: {
                                    "Content-Type": filename.endsWith(".mpd") ? "application/dash+xml" : "video/mp4",
                                },
                            });
                            if (!response.ok) {
                                throw new Error(`Upload failed with status ${response.status}`);
                            }

                            uploadedSize += file.size;
                            setUploadProgress((uploadedSize / totalSize) * 100);
                        } catch (e) {
                            if (retryCount > 0) {
                                console.warn(`Retrying upload for ${filename}...`);
                                await upload(retryCount - 1);
                            } else {
                                throw e;
                            }
                        }
                    };
                    await upload(3);
                }),
            );

            setStatusMessage(`アップロード完了！ Manifest Path: ${manifestPath}`);
        } catch (error) {
            console.error("Processing Error:", error);
            setStatusMessage(`エラーが発生しました: ${error}`);
        } finally {
            setIsProcessing(false);
            event.target.value = "";
        }
    };

    const clearOpfs = async () => {
        if (!window.confirm("OPFS内の全データを削除しますか？")) return;

        try {
            const root = await navigator.storage.getDirectory();
            // @ts-expect-error
            for await (const name of root.keys()) {
                await root.removeEntry(name, { recursive: true });
            }

            console.log("OPFS Cleared");
            setStatusMessage("OPFSを空にしました");
        } catch (error) {
            console.error("Clear OPFS Error:", error);
            setStatusMessage("削除に失敗しました");
        }
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h1>DASH形式で動画をアップロード</h1>

            <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "8px" }}>
                <h3>1. ファイルを選択してアップロード</h3>
                <input type="file" accept="video/webm,video/mp4" onChange={handleFileChange} disabled={isProcessing} />
                <p style={{ color: isProcessing ? "blue" : "black" }}>
                    <strong>Status:</strong> {statusMessage}
                </p>
                {isProcessing && (
                    <div>
                        <progress value={uploadProgress} max="100" style={{ width: "100%" }} />
                        <p>{Math.round(uploadProgress)}%</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoUploader;
