"use client";

import { useRouter } from "next/navigation";

import { IconX } from "@tabler/icons-react";

export default function BackButton() {
    const router = useRouter();

    const handleBack = () => {
        const href = "/";

        // View Transition APIがサポートされているか確認
        if (!document.startViewTransition) {
            router.push(href);
            return;
        }

        // プレイヤーにview-transition-nameを設定（既に設定されているはず）
        const player = document.querySelector('[style*="view-transition-name"]') as HTMLElement;
        if (player) {
            player.style.viewTransitionName = "player-slide";
        }

        const transition = document.startViewTransition(() => {
            router.push(href);
        });

        // トランジション完了後にクリア
        transition.finished.finally(() => {
            if (player) {
                player.style.viewTransitionName = "";
            }
        });
    };

    return (
        <button type="button" onClick={handleBack} className="flex items-center gap-2 px-6 py-3 hover:bg-white/20 transition-colors cursor-pointer">
            <IconX size={20} />
        </button>
    );
}
