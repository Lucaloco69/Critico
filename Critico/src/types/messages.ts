export type MessageType =
  | "direct"
  | "request"
  | "request_qr_ready"
  | "request_accepted"
  | "request_declined"
  | "product";

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
  read: boolean;
  message_type?: MessageType;
  product_id?: number;
  sender: MessageSender | null;
}
