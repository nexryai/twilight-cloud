"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function signIn(prevState: string | undefined, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
        await auth.api.signInEmail({
            body: {
                email,
                password,
            },
            headers: await headers(),
        });
    } catch (error: any) {
        return error.message || "ログインに失敗しました";
    }

    redirect("/");
}

export async function signUp(prevState: string | undefined, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
        await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
            headers: await headers(),
        });
    } catch (error: any) {
        return error.message || "アカウント作成に失敗しました";
    }

    redirect("/");
}
