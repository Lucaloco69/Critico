export const EXP_PER_REVIEW = 100;
export const PRIVATE_MESSAGE_TYPE = "direct";

export const nextExpForLevel = (level: number) => {
  switch (level) {
    case 0:
      return 100;
    case 1:
      return 300;
    case 2:
      return 600;
    case 3:
      return 2000;
    case 4:
      return 5000;
    default:
      return 5000;
  }
};

export const roundStars = (stars: number | null | undefined) => Math.round((stars ?? 0) * 10) / 10;

export const firstProductImage = (images?: { image_url: string; order_index: number }[]) => {
  if (!images?.length) return null;
  return images.slice().sort((a, b) => a.order_index - b.order_index)[0]?.image_url ?? null;
};

export const progressPctFrom = (exp: number, expNext: number, trustlevel: number) => {
  if (trustlevel >= 5) return 100;
  if (!expNext) return 0;
  return Math.min(100, Math.round((exp / expNext) * 100));
};
