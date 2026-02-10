import { useCreateProduct } from "../hooks/createProduct/useCreateProduct";
import { useImageUpload } from "../hooks/createProduct/useImageUpload";
import { useProductSubmit } from "../hooks/createProduct/useProductSubmit";
import { useTags } from "../hooks/createProduct/useTags";
import Header from "../components/createProduct/Header";
import ImageUpload from "../components/createProduct/ImageUpload";
import ProductForm from "../components/createProduct/ProductForm";
import TagSelector from "../components/createProduct/TagSelector";
import StatusMessages from "../components/createProduct/StatusMessages";
import SubmitButton from "../components/createProduct/SubmitButton";

export default function CreateProduct() {
  const {
    name,
    beschreibung,
    price,
    selectedFiles,
    previewUrls,
    currentImageIndex,
    availableTags,
    selectedTags,
    loading,
    uploading,
    error,
    success,
    setName,
    setBeschreibung,
    setPrice,
    setSelectedFiles,
    setPreviewUrls,
    setCurrentImageIndex,
    setSelectedTags,
    setLoading,
    setUploading,
    setError,
    setSuccess,
  } = useCreateProduct();

  const { handleFileSelect, removeImage, nextImage, prevImage } = useImageUpload(
    selectedFiles,
    setSelectedFiles,
    previewUrls,
    setPreviewUrls,
    currentImageIndex,
    setCurrentImageIndex
  );

  const { handleSubmit } = useProductSubmit(
    name,
    beschreibung,
    price,
    selectedFiles,
    selectedTags,
    setLoading,
    setUploading,
    setError,
    setSuccess
  );

  const { toggleTag } = useTags(selectedTags, setSelectedTags);

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-gray-950">
      <Header />

      {/* Page container */}
      <main class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Card */}
        <div class="bg-white/90 dark:bg-gray-900/60 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-5 sm:mb-6">
            Artikel einstellen
          </h1>

          <form onSubmit={handleSubmit} class="space-y-5 sm:space-y-6">
            <ImageUpload
              previewUrls={previewUrls}
              currentImageIndex={currentImageIndex}
              setCurrentImageIndex={setCurrentImageIndex}
              onFileSelect={handleFileSelect}
              onRemoveImage={removeImage}
              onNextImage={nextImage}
              onPrevImage={prevImage}
            />

            <ProductForm
              name={name}
              setName={setName}
              price={price}
              setPrice={setPrice}
              beschreibung={beschreibung}
              setBeschreibung={setBeschreibung}
            />

            <TagSelector
              availableTags={availableTags}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
            />

            <StatusMessages error={error} success={success} />

            <div class="pt-1">
              <SubmitButton loading={loading} uploading={uploading} />
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
