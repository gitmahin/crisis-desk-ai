
import { sharedConfig } from "@/config/shared.config";
import { createGroq } from "@ai-sdk/groq"

export const groq = createGroq({
    apiKey: ""
}) 
