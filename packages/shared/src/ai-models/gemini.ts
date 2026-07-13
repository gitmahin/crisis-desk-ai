import { sharedConfig } from "@/config/shared.config"
import {createGoogleGenerativeAI} from "@ai-sdk/google"


export const google = createGoogleGenerativeAI({
    apiKey: sharedConfig.GEMINI_API_KEY
})