export interface ChatPreview {
  chatId: number;
  partnerId: number;
  partnerName: string;
  partnerSurname: string;
  partnerPicture: string | null;
  partnerTrustlevel?: number;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageType?: string;
  unreadCount: number;
  hasUnreadRequest?: boolean;
}
