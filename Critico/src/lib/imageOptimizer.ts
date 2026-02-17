// KI Generiert -- Für Lighthouse Performance Steigerung
/**
 * Optimizes a Supabase Storage URL by using the image transformation endpoint.
 * 
 * @param url The original Supabase storage URL
 * @param width The desired width (optional)
 * @param height The desired height (optional)
 * @param quality Quality (0-100), default 80
 * @returns The optimized URL or the original if not a Supabase URL
 */
// src/lib/imageOptimizer.ts

/**
 * Optimizes a Supabase Storage URL by appending transformation parameters.
 * 
 * @param url The original Supabase storage URL
 * @param width The desired width (optional)
 * @param height The desired height (optional)
 * @param quality Quality (0-100), default 80
 * @returns The optimized URL or the original if not a Supabase URL
 */
// src/lib/imageOptimizer.ts

/**
 * Optimizes a Supabase Storage URL using the wsrv.nl image proxy.
 * This provides resizing, compression, and WebP conversion for free,
 * which is essential if Supabase Image Transformations are not enabled (e.g. Free Tier).
 * 
 * @param url The original Supabase storage URL
 * @param width The desired width (optional)
 * @param height The desired height (optional)
 * @param quality Quality (0-100), default 80
 * @returns The optimized URL or the original if not a Supabase URL
 */
export function getOptimizedImageUrl(url: string | null | undefined, width?: number, height?: number, quality = 80): string | undefined {
    if (!url) return undefined;

    // Skip optimization for data URLs or blobs
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;

    // Check if it's a Supabase URL (more permissive check)
    // wsrv.nl can optimize any public URL, but let's stick to Supabase for now to be safe
    if (!url.includes("supabase.co/storage/v1/object/public")) {
        return url;
    }

    // Use wsrv.nl (formerly images.weserv.nl) for robust caching & resizing
    // Docs: https://wsrv.nl/
    const baseUrl = "https://wsrv.nl/";
    const params = new URLSearchParams();

    params.set("url", url); // The original image URL

    if (width) params.set("w", width.toString());
    if (height) params.set("h", height.toString());

    params.set("q", quality.toString());
    params.set("output", "webp"); // Force WebP (smaller file size)
    params.set("l", "9"); // Max compression level for webp (default is 6, 9 is smaller but slower to generate once)
    params.set("we", ""); // Serve WebP to browsers that support it (redundant with output=webp but good practice)
    params.set("il", ""); // Progressive load (interlaced)

    return `${baseUrl}?${params.toString()}`;
}


export function getSrcSet(url: string | null | undefined): string | undefined {
    if (!url) return undefined;


    const w300 = getOptimizedImageUrl(url, 300);
    const w500 = getOptimizedImageUrl(url, 500);
    const w800 = getOptimizedImageUrl(url, 800);

    if (!w300 || !w500 || !w800) return undefined;

    return `${w300} 300w, ${w500} 500w, ${w800} 800w`;
}
