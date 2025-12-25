"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Binary } from "mongodb";

import { auth } from "@/auth";
import { db } from "@/db";

import { Buffer } from "node:buffer";

export interface PasswordEncryptedKey {
    salt: Binary;
    iv: Binary;
    ciphertext: Binary;
}

export interface WebAuthnEncryptedKey {
    credentialId: Binary;
    iv: Binary;
    ciphertext: Binary;
}

export interface KeyRing {
    userId: string;
    passwordEncryptedKey?: PasswordEncryptedKey;
    webauthnEncryptedKey?: WebAuthnEncryptedKey;
}

type PasswordEncryptedKeyString = Omit<PasswordEncryptedKey, "salt" | "iv" | "ciphertext"> & { salt: string; iv: string; ciphertext: string };
type WebAuthnEncryptedKeyString = Omit<WebAuthnEncryptedKey, "credentialId" | "iv" | "ciphertext"> & { credentialId: string; iv: string; ciphertext: string };

export interface EncryptedKeys {
    userId: string;
    passwordEncryptedKey: PasswordEncryptedKeyString;
    webauthnEncryptedKey: WebAuthnEncryptedKeyString;
}

const getUserOrFail = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        console.log("invalid session or not authenticated");
        redirect("/signin");
        throw new Error("invalid session or not authenticated");
    }

    return session.user;
};

const getKeyRing = async () => {
    const user = await getUserOrFail();
    const keyRing = await db.collection<KeyRing>("keyrings").findOne({ userId: user.id });
    return { keyRing, userId: user.id };
};

export async function getKeys() {
    const { keyRing } = await getKeyRing();
    if (!keyRing) {
        return null;
    }

    // Convert Binary to base64 for serialization
    return JSON.parse(
        JSON.stringify(keyRing, (key, value) => {
            if (value?.constructor && value.constructor.name === "Binary") {
                return (value as Binary).toString("base64");
            }
            return value;
        }),
    );
}

export async function savePasswordEncryptedKey(keyData: PasswordEncryptedKeyString) {
    const user = await getUserOrFail();
    const { salt, iv, ciphertext } = keyData;

    const passwordEncryptedKey: PasswordEncryptedKey = {
        salt: new Binary(Buffer.from(salt, "base64")),
        iv: new Binary(Buffer.from(iv, "base64")),
        ciphertext: new Binary(Buffer.from(ciphertext, "base64")),
    };

    await db.collection<KeyRing>("keyrings").updateOne({ userId: user.id }, { $set: { passwordEncryptedKey } }, { upsert: true });
}

export async function saveWebAuthnEncryptedKey(keyData: WebAuthnEncryptedKeyString) {
    const user = await getUserOrFail();
    const { credentialId, iv, ciphertext } = keyData;

    const webauthnEncryptedKey: WebAuthnEncryptedKey = {
        credentialId: new Binary(Buffer.from(credentialId, "base64")),
        iv: new Binary(Buffer.from(iv, "base64")),
        ciphertext: new Binary(Buffer.from(ciphertext, "base64")),
    };

    await db.collection<KeyRing>("keyrings").updateOne({ userId: user.id }, { $set: { webauthnEncryptedKey } }, { upsert: true });
}
