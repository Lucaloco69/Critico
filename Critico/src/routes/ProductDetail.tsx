import { createMemo, Show } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import ImageGallery from "../components/ImageGallery";
import ProductInfo from "../components/ProductInfo";
import CommentSection from "../components/CommentSection";
import Modal from "../components/Modal";
import { isLoggedIn } from "../lib/sessionStore";
import { useProductDetail } from "../hooks/useProductDetail";
import { useRealtimeProductDetail } from "../hooks/useRealtimeProductDetail";
import { t } from "../lib/i18n";
import { BackButton } from "../components/ui/BackButton";

export default function ProductDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const productId = createMemo(() => Number(params.id));

  const {
    product,
    comments,
    loading,
    currentUserId,
    canComment,
    checkingPermission,
    hasRequested,
    modal,
    closeModal,
    handleModalAction,
    handleRequestTest,
    handleContact,
    handleSubmitComment,

  } = useProductDetail(productId, navigate);

  // ✅ NEU: Realtime Updates für Product + Comments
  useRealtimeProductDetail(productId, () => {

  });

  // ... existing code ...
  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Modal modal={modal} onClose={closeModal} onAction={handleModalAction} />

      <header class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <BackButton />
          <A href="/home" class="text-2xl font-bold text-sky-600 dark:text-sky-400">
            Critico
          </A>
        </div>
      </header>

      <Show when={loading()}>
        <div class="flex justify-center items-center py-20">
          <div class="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Show>

      <Show when={!loading() && product()}>
        <main class="max-w-7xl mx-auto px-4 py-8">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
            <div class="grid lg:grid-cols-2 gap-8 p-8">
              <div class="space-y-4">
                <ImageGallery images={product()!.images} productName={product()!.name} />
              </div>

              <div>
                <ProductInfo
                  product={product()!}
                  commentsCount={comments().filter((c) => c.stars !== null).length}
                  currentUserId={currentUserId()}
                  hasRequested={hasRequested()}
                  onRequestTest={handleRequestTest}
                  onContact={handleContact}
                />
              </div>
            </div>
          </div>

          <CommentSection
            comments={comments()}
            isLoggedIn={isLoggedIn()}
            canComment={canComment()}
            currentUserId={currentUserId()}
            checkingPermission={checkingPermission()}
            onSubmitComment={handleSubmitComment}
          />
        </main>
      </Show>
    </div>
  );
}
