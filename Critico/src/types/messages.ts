export type MessageType =
  | "direct"
  | "request"
  | "request_qr_ready"
  | "request_accepted"
  | "request_declined"
  | "product";

export const MESSAGE_TYPES = {
  DIRECT: "direct",
  REQUEST: "request",
  REQUEST_QR_READY: "request_qr_ready",
  REQUEST_ACCEPTED: "request_accepted",
  REQUEST_DECLINED: "request_declined",
  PRODUCT: "product",
} as const;

export const VALID_CHAT_MESSAGE_TYPES = [
  MESSAGE_TYPES.DIRECT,
  MESSAGE_TYPES.REQUEST,
  MESSAGE_TYPES.REQUEST_QR_READY,
  MESSAGE_TYPES.REQUEST_ACCEPTED,
  MESSAGE_TYPES.REQUEST_DECLINED,
];

export interface MessageSender {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
  trustlevel?: number | null;
}

export interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  receiver_id?: number;
  read: boolean;
  message_type?: MessageType;
  product_id?: number;
  qr_data_url?: string | null;
  product?: { id: number; owner_id: number } | null;
  sender: MessageSender;
}

export interface ChatPartner {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
  trustlevel: number | null;
}
