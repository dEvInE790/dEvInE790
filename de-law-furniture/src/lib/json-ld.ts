/** Serialises JSON-LD safely for a <script> tag (no "</script>" break-out from admin-entered text). */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
