import { baseConfig } from "@/config"
import {createGoogleGenerativeAI} from "@ai-sdk/google"

export const google = createGoogleGenerativeAI({
    apiKey: baseConfig.GEMINI_API_KEY
})