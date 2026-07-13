import { baseConfig } from "@/config";
import { getGroq } from "@repo/shared";

export const groq = getGroq(baseConfig.GROQ_API_KEY);
