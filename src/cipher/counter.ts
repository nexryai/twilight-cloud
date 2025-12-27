export function calculateCounter(baseIv: Uint8Array, byteOffset: number): Uint8Array {
    const counterBlock = new Uint8Array(baseIv);
    const dataView = new DataView(counterBlock.buffer);

    // AESブロックサイズ (16バイト) 単位のブロック数を計算
    const blockIndex = BigInt(Math.floor(byteOffset / 16));

    // IVの後半8バイト(64bit)をBigIntとして読み出し、ブロック数を加算
    const lowBits = dataView.getBigUint64(8, false);
    dataView.setBigUint64(8, lowBits + blockIndex, false);

    return counterBlock;
}

export function generateCounterBlock(): Uint8Array {
    const iv = new Uint8Array(16);
    // 前半8バイトをランダムなNonceにする
    // 後半8バイトはCounter (初期値0) として残す
    crypto.getRandomValues(iv.subarray(0, 8));
    return iv;
}
