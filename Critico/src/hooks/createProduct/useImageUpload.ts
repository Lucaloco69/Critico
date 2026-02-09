import { createSignal, Accessor, Setter } from "solid-js";

export function useImageUpload(
  selectedFiles: Accessor<File[]>,
  setSelectedFiles: Setter<File[]>,
  previewUrls: Accessor<string[]>,
  setPreviewUrls: Setter<string[]>,
  currentImageIndex: Accessor<number>,
  setCurrentImageIndex: Setter<number>
) {
  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length === 0) return;

    const newFiles = [...selectedFiles(), ...files].slice(0, 10);
    setSelectedFiles(newFiles);

    const newPreviews: string[] = [];
    let loaded = 0;

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        loaded++;
        if (loaded === newFiles.length) {
          setPreviewUrls(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    if (currentImageIndex() >= previewUrls().length - 1) {
      setCurrentImageIndex(Math.max(0, previewUrls().length - 2));
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < previewUrls().length - 1 ? prev + 1 : prev
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  return {
    handleFileSelect,
    removeImage,
    nextImage,
    prevImage,
  };
}
