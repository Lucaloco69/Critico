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
import { t } from "../lib/i18n";

export default function CreateProduct() {
  const {
    name,
    description,
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
    setDescription,
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
    description,
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
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Page container */}
      <main class="max-w-5xl mx-auto px-4 py-6">
        {/* Card */}
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-6 lg:p-8">
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
              description={description}
              setDescription={setDescription}
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
