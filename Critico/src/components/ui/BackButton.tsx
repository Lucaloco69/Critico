import { useNavigate } from "@solidjs/router";
import { type Component, splitProps } from "solid-js";
import { t } from "../../lib/i18n";

interface BackButtonProps {
    class?: string;
    onClick?: (e: MouseEvent) => void;
    label?: string; // Optional override for aria-label
}

export const BackButton: Component<BackButtonProps> = (props) => {
    const navigate = useNavigate();
    const [local, others] = splitProps(props, ["class", "onClick", "label"]);

    const handleClick = (e: MouseEvent) => {
        if (local.onClick) {
            local.onClick(e);
        } else {
            navigate(-1);
        }
    };

    return (
        <button
            onClick={handleClick}
            class={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300 ${local.class || ""}`}
            aria-label={local.label || t("profile.back")}
            {...others}
        >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
        </button>
    );
};
