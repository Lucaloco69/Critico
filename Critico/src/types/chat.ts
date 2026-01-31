import type { MessageType } from "./messages";

export interface ChatPreview {
  chatId: number;
  partnerId: number;
  partnerName: string;
  partnerSurname: string;
  partnerPicture: string | null;
  partnerTrustlevel?: number;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageType?: MessageType;
  unreadCount: number;
  hasUnreadRequest?: boolean;
}
