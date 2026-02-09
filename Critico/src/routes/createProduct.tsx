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
    setLoading,      // Wird für useProductSubmit gebraucht
    setUploading,    // Wird für useProductSubmit gebraucht
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
    setLoading,      // Hier wird es übergeben
    setUploading,    // Hier wird es übergeben
    setError,
    setSuccess
  );

  const { toggleTag } = useTags(selectedTags, setSelectedTags);

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main class="max-w-4xl mx-auto px-4 py-8">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Artikel einstellen
          </h1>

          <form onSubmit={handleSubmit} class="space-y-6">
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

            <SubmitButton loading={loading} uploading={uploading} />
          </form>
        </div>
      </main>
    </div>
  );
}
