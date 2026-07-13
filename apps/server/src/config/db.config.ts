import "dotenv/config";
type DbConfigType = {
  DATABASE_URI: string;
};

export const dbConfig: DbConfigType = {
  DATABASE_URI: process.env.DATABASE_URL ?? "",
  
};
