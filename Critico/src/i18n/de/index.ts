import { dict as login } from "./login";
import { dict as signup } from "./signup";
import { dict as productGrid } from "./productGrid";
import { dict as searchBar } from "./searchBar";
import { dict as starRating } from "./starRating";
import { dict as productCard } from "./productCard";
import { dict as productInfo } from "./productInfo";
import { dict as requests } from "./requests";
import { dict as publicProfile } from "./publicProfile";
import { dict as publicProfileHeader } from "./publicProfileHeader";
import { dict as publicProfileProductCard } from "./publicProfileProductCard";
import { dict as publicProfileProductsSection } from "./publicProfileProductsSection";
import { dict as publicProfileStatsGrid } from "./publicProfileStatsGrid";
import { dict as profile } from "./profile";
import { dict as profileHeader } from "./profileHeader";
import { dict as profileProductGrid } from "./profileProductGrid";
import { dict as profilePicture } from "./profilePicture";
import { dict as profileProgressBar } from "./profileProgressBar";
import { dict as profileStatsCards } from "./profileStatsCards";
import { dict as messagesChatPreviewItem } from "./messagesChatPreviewItem";
import { dict as messagesEmptyChatsState } from "./messagesEmptyChatsState";
import { dict as messagesHeader } from "./messagesHeader";
import { dict as messagesSearchBar } from "./messagesSearchBar";
import { dict as commentSection } from "./commentSection";
import { dict as modal } from "./modal";
import { dict as createProductHeader } from "./createProductHeader";
import { dict as createProductImageUpload } from "./createProductImageUpload";
import { dict as createProductForm } from "./createProductForm";
import { dict as createProductSubmitButton } from "./createProductSubmitButton";
import { dict as createProductTagSelector } from "./createProductTagSelector";
import { dict as chatMessageInput } from "./chatMessageInput";
import { dict as chatMessagesList } from "./chatMessagesList";
import { dict as chatRequestMessageBubble } from "./chatRequestMessageBubble";
import { dict as chatRequestQrReadyBubble } from "./chatRequestQrReadyBubble";
import { dict as headerActions } from "./headerActions";
import { dict as createProduct } from "./createProduct";
import { dict as tags } from "./tags";
import { dict as filterDropdown } from "./filterDropdown";
import { dict as activate } from "./activate";




// WICHTIG: Datei heißt useProductDetail.ts, aber Namespace wird zu "productDetail"
import { dict as productDetail } from "./useProductDetail";

export const dict = {
  login,
  signup,
  productGrid,
  searchBar,
  starRating,
  productCard,
  productInfo,
  requests,
  publicProfile,
  publicProfileHeader,
  publicProfileProductCard,
  publicProfileProductsSection,
  publicProfileStatsGrid,
  profile,
  profileHeader,
  profileProductGrid,
  profilePicture,
  profileProgressBar,
  profileStatsCards,
  messagesChatPreviewItem,
  messagesEmptyChatsState,
  messagesHeader,
  messagesSearchBar,
  commentSection,
  modal,
  createProductHeader,
  createProductImageUpload,
  createProductForm,
  createProductSubmitButton,
  createProductTagSelector,
  chatMessageInput,
  chatMessagesList,
  chatRequestMessageBubble,
  chatRequestQrReadyBubble,
  headerActions,
  createProduct,
  productDetail,
  tags,
  filterDropdown,
  activate
} as const;
