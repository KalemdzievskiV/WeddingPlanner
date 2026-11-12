import { Cormorant_Garamond, Great_Vibes } from "next/font/google";

/** Script for names and section titles, serif for the invitation text. Both cover Macedonian Cyrillic. Only loaded where the invitation is shown. */
const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inv-script", display: "swap" });
const serif = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inv-serif",
  display: "swap",
});

/** Class names that define the invitation font variables; put them on the invitation's root. */
export const inviteFontClass = `${script.variable} ${serif.variable}`;
