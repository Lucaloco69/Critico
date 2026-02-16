
export function ProductCardSkeleton() {
    return (
        <div class="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            {/* Image Area */}
            <div class="relative bg-gray-100 dark:bg-gray-700 p-3 animate-pulse">
                <div class="aspect-square bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
            </div>

            <div class="p-4 space-y-3">
                {/* Title & Price */}
                <div class="flex justify-between items-start gap-2">
                    <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
                    <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                </div>

                {/* Rating */}
                <div class="flex items-center gap-2">
                    <div class="flex gap-1">
                        {[1, 2, 3, 4, 5].map(() => (
                            <div class="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        ))}
                    </div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div>
                </div>

                {/* Description */}
                <div class="space-y-2">
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse"></div>
                </div>

                {/* Tags */}
                <div class="flex gap-2 pt-2">
                    <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div>
                    <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}
