/**
 * Product / Comment (Domain Types)
 * -------------------------------
 * Gemeinsame TypeScript Interfaces für Produkt- und Kommentar-Daten, wie sie in der UI und beim
 * Transformieren von Supabase-Responses verwendet werden.
 *
 * Product:
 * - Repräsentiert ein Produkt inkl. Kernfeldern (name, beschreibung, price), Bilddaten (picture als Cover + images[]),
 *   Owner-Referenz (owner_id), Bewertungs-Schnitt (stars) und zugeordneten Tags.
 * - `User?` ist optional, d.h. Produktdaten können ohne geladenen Owner-Join genutzt werden; zusätzlich ist
 *   `trustlevel?: number | null` im User-Objekt optional *und* nullable, um sowohl “nicht mitgeladen” als auch
 *   “explizit null in der DB” abbilden zu können. [web:351][web:367]
 *
 * Comment:
 * - Repräsentiert einen Kommentar/Review (content, stars, created_at) inkl. Sender-Referenz (sender_id) und
 *   den zugehörigen Sender-Userdaten (User).
 * - `stars: number | null` drückt aus, dass ein Kommentar ohne Bewertung existieren darf (null) und damit
 *   eine andere Semantik hat als “Property fehlt” (optional). [web:369][web:372]
 */

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
    trustlevel?: number | null; // ✅ NEU
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
    trustlevel?: number | null; // ✅ NEU
  };
}
