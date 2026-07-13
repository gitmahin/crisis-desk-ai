export const convertToValidJson = (data: string) => {
  const cleaned = data
    .trim()
    .replace(/^```json/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return data;
  }
};
