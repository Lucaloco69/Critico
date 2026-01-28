/**
 * ChatPreview (Type)
 * ------------------
 * TypeScript Interface für die Vorschau eines Chats (z.B. in der Chat-/Messages-Liste).
 *
 * - Definiert die Form eines Objekts, das alle UI-relevanten Infos für eine Chat-Kachel enthält:
 *   Chat-ID, Partnerdaten (Name, Bild, optional Trustlevel), letzte Nachricht (Text, Zeit, optional Typ),
 *   ungelesene Anzahl sowie optionales Flag für ungelesene Requests.
 * - Optional Properties sind mit `?` markiert (z.B. partnerTrustlevel, lastMessageType, hasUnreadRequest),
 *   d.h. diese Felder können fehlen, ohne dass TypeScript einen Fehler wirft. [web:351]
 * - Durch `export interface ...` kann der Typ in anderen Dateien importiert und wiederverwendet werden. [web:356]
 */

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
