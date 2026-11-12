/** Extra choices offered on the quotation form after the furniture categories. */
export const QUOTE_EXTRA_CATEGORIES = ["Interior furnishing (full room / home)", "Exterior furniture", "Other / not sure yet"];

export const buildQuoteCategories = (categoryNames: string[]) => [...categoryNames, ...QUOTE_EXTRA_CATEGORIES];
