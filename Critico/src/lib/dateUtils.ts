// KI generiert -- Für die richtige Zeitangabe 
export const formatChatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } else if (diffDays === 1) {
        return "Gestern";
    } else if (diffDays < 7) {
        return date.toLocaleDateString("de-DE", { weekday: "short" });
    } else {
        return date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
        });
    }
};
