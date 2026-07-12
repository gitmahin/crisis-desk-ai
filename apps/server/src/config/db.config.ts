import "dotenv/config";
type DbConfigType = {
  DATABASE_URI: string;
};

export const DbConfig: DbConfigType = {
  DATABASE_URI: process.env.DATABASE_URL ?? "",
};
