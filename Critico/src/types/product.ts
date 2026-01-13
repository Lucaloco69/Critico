export interface Product {
  id: number;
  name: string;
  beschreibung: string;
  price: number | null;
  picture: string | null;
  images: string[];
  owner_id: number;
  stars: number;
  User?: {
    id: number;
    name: string;
    surname: string;
    email: string;
    picture: string | null;
  };
  tags: { id: number; name: string }[];
}

export interface Comment {
  id: number;
  content: string;
  stars: number | null;
  created_at: string;
  sender_id: number;
  User: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
  } | null;
}
