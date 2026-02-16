/**
 * Optimizes a Supabase Storage URL by using the image transformation endpoint.
 * 
 * @param url The original Supabase storage URL
 * @param width The desired width (optional)
 * @param height The desired height (optional)
 * @param quality Quality (0-100), default 80
 * @returns The optimized URL or the original if not a Supabase URL
 */
export function getOptimizedImageUrl(url: string | null | undefined, width?: number, height?: number, quality = 80): string | undefined {
    if (!url) return undefined;

    // Check if it's a Supabase URL
    if (!url.includes("supabase.co/storage/v1/object/public/")) {
        return url;
    }

    // Replace /object/public/ with /render/image/public/
    // This is the standard endpoint for Supabase Image Transformations
    let optimizedUrl = url.replace("/object/public/", "/render/image/public/");

    const params = new URLSearchParams();

    if (width) params.set("width", width.toString());
    if (height) params.set("height", height.toString());

    params.set("quality", quality.toString());
    params.set("format", "webp"); // Force WebP for better compression
    params.set("resize", "contain"); // Ensure image fits within dimensions

    return `${optimizedUrl}?${params.toString()}`;
}
