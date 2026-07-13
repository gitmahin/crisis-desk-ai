import { BaseConfig } from "@/config";
import { getGroq } from "@repo/shared";

export const groq = getGroq(BaseConfig.GROQ_API_KEY)