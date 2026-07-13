export const convertToValidJson = (data: string) => {
    return JSON.parse(data.trim().replace(/^```json/, "").replace(/```$/, "").trim())
}