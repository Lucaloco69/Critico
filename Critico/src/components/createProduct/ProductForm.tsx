import { Accessor, Setter } from "solid-js";

interface ProductFormProps {
  name: Accessor<string>;
  setName: Setter<string>;
  price: Accessor<string>;
  setPrice: Setter<string>;
  beschreibung: Accessor<string>;
  setBeschreibung: Setter<string>;
}

export default function ProductForm(props: ProductFormProps) {
  return (
    <>
      {/* Titel */}
      <div>
        <label
          for="name"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Titel
        </label>
        <input
          id="name"
          type="text"
          value={props.name()}
          onInput={(e) => props.setName(e.currentTarget.value)}
          placeholder="z.B. SmartGrow Mini - Intelligenter Indoor-Kräutergarten"
          required
          class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Preis */}
      <div>
        <label
          for="price"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Preis
        </label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">
            €
          </span>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={props.price()}
            onInput={(e) => props.setPrice(e.currentTarget.value)}
            placeholder="0.00"
            class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Beschreibung */}
      <div>
        <label
          for="beschreibung"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Beschreibe deinen Artikel
        </label>
        <textarea
          id="beschreibung"
          value={props.beschreibung()}
          onInput={(e) => props.setBeschreibung(e.currentTarget.value)}
          placeholder="z.B. Das System überwacht selbstständig Wasserbedarf..."
          rows="6"
          required
          class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>
    </>
  );
}
