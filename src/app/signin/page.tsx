"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { IconLogin2, IconUserCheck } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";

import { signIn, signUp } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function SubmitButton({ type }: { type: "signin" | "signup" }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className="flex gap-4 justify-center items-center mt-8 w-full text-white py-2 px-4 rounded-md bg-black transition-colors duration-300 disabled:bg-gray-400 cursor-pointer">
            {type === "signin" ? <IconLogin2 size={18} /> : <IconUserCheck size={18} />}
            {pending ? "Submitting..." : type === "signin" ? "Sign in" : "Sign up"}
        </button>
    );
}

const formVariants = {
    hidden: { opacity: 0, x: -10 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 },
};

export default function SignInPage() {
    const [signInState, signInAction] = useActionState(signIn, undefined);
    const [signUpState, signUpAction] = useActionState(signUp, undefined);
    const [formType, setFormType] = useState<"signin" | "signup">("signin");

    return (
        <div className="flex h-screen justify-between font-sans">
            <div className="flex flex-col justify-between w-1/2 bg-white/80 h-full overflow-hidden">
                <div className="flex-1 flex flex-col justify-center p-8">
                    <div className="flex flex-col justify-center p-8">
                        <h1 className="text-2xl font-bold text-center mb-2">Welcome to Twilight Cloud</h1>

                        <div className="h-6 mb-8 text-center text-gray-600 relative">
                            <AnimatePresence mode="wait">
                                <motion.p key={formType} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute w-full">
                                    {formType === "signin" ? "Sign in to your account" : "Create a new account"}
                                </motion.p>
                            </AnimatePresence>
                        </div>

                        <Tabs value={formType} onValueChange={(value) => setFormType(value as "signin" | "signup")} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="signin">Sign In</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <AnimatePresence mode="wait">
                                <div key={formType}>
                                    <TabsContent value="signin" className="mt-0 h-64">
                                        <form action={signInAction} className="space-y-4">
                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                                    Email
                                                </label>
                                                <Input id="email" name="email" type="email" required />
                                            </div>
                                            <div>
                                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                                    Password
                                                </label>
                                                <Input id="password" name="password" type="password" required />
                                            </div>
                                            {signInState && <p className="text-red-500 text-xs">{signInState}</p>}
                                            <SubmitButton type="signin" />
                                        </form>
                                    </TabsContent>

                                    <TabsContent value="signup" className="mt-0 h-64">
                                        <form action={signUpAction} className="space-y-4">
                                            <div>
                                                <label htmlFor="name-signup" className="block text-sm font-medium text-gray-700">
                                                    Full Name
                                                </label>
                                                <Input id="name-signup" name="name" type="text" required />
                                            </div>
                                            <div>
                                                <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700">
                                                    Email
                                                </label>
                                                <Input id="email-signup" name="email" type="email" required />
                                            </div>
                                            <div>
                                                <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700">
                                                    Password
                                                </label>
                                                <Input id="password-signup" name="password" type="password" required />
                                            </div>
                                            {signUpState && <p className="text-red-500 text-xs">{signUpState}</p>}
                                            <SubmitButton type="signup" />
                                        </form>
                                    </TabsContent>
                                </div>
                            </AnimatePresence>
                        </Tabs>
                    </div>
                </div>
                <div className="flex p-4 items-end text-gray-400 font-sm">
                    <p>&copy; {new Date().getFullYear()} nexryai All rights reserved.</p>
                </div>
            </div>
            <div className="w-1/2 h-screen">
                <img className="object-cover w-full h-full" alt="login bg" src="https://images.unsplash.com/photo-1571454441103-39766107ff06?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" />
            </div>
        </div>
    );
}
