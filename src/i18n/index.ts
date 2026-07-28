import { es } from "./es";
import { en } from "./en";
import { pt } from "./pt";

export type Translation = typeof es;

export type LangCode = "es" | "en" | "pt";

export const translations: Record<LangCode, Translation> = { es, en, pt };

export { es, en, pt };
