import { Accessor, Setter } from "solid-js";
import { t } from "../../lib/i18n";

interface ProductFormProps {
  name: Accessor<string>;
  setName: Setter<string>;
  price: Accessor<string>;
  setPrice: Setter<string>;
  description: Accessor<string>;
  setDescription: Setter<string>;
}

export default function ProductForm(props: ProductFormProps) {
  const inputBase =
    "w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/40 " +
    "text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 " +
    "shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500";

  const labelBase = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  return (
    <>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="name" class={labelBase}>
            {t("createProductForm.titleLabel")}
          </label>
          <input
            id="name"
            type="text"
            value={props.name()}
            onInput={(e) => props.setName(e.currentTarget.value)}
            placeholder={t("createProductForm.titlePlaceholder")}
            required
            class={`${inputBase} h-11 px-4 text-sm sm:text-base`}
          />
        </div>

        <div>
          <label for="price" class={labelBase}>
            {t("createProductForm.priceLabel")}
          </label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/50 font-semibold select-none">
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
              inputmode="decimal"
              class={`${inputBase} h-11 pl-10 pr-4 text-sm sm:text-base`}
            />
          </div>
        </div>
      </div>

      <div>
        <label for="description" class={labelBase}>
          {t("createProductForm.descriptionLabel")}
        </label>
        <textarea
          id="description"
          value={props.description()}
          onInput={(e) => props.setDescription(e.currentTarget.value)}
          placeholder={t("createProductForm.descriptionPlaceholder")}
          rows={4}
          required
          class={`${inputBase} px-4 py-3 text-sm sm:text-base resize-y min-h-36`}
        />
      </div>
    </>
  );
}
