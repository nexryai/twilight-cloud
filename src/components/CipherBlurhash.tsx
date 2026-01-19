"use client";

import { useEffect, useRef, useState } from "react";

import { decodeBlurHash } from "fast-blurhash";

import { decryptMetadata } from "@/cipher/block";
import { useCipherKey } from "@/context/CipherContext";

interface Props {
    encryptedHash: string;
    width?: number;
    height?: number;
    className?: string;
}

export default function CipherBlurhash({ encryptedHash, width = 64, height = 64, className }: Props) {
    const { metadataKey } = useCipherKey();
    const [hash, setHash] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!metadataKey) return;

        let isMounted = true;
        decryptMetadata(encryptedHash, metadataKey)
            .then((decrypted) => {
                if (isMounted) setHash(decrypted);
            })
            .catch((err) => {
                console.error("Decryption failed:", err);
            });

        return () => {
            isMounted = false;
        };
    }, [encryptedHash, metadataKey]);

    useEffect(() => {
        if (!hash || !canvasRef.current) return;

        const pixels = decodeBlurHash(hash, width, height);
        const ctx = canvasRef.current.getContext("2d");

        if (ctx) {
            // @ts-expect-error
            const imageData = new ImageData(pixels, width, height);
            ctx.putImageData(imageData, 0, 0);
        }
    }, [hash, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={className}
            style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
            }}
        />
    );
}
