import "dotenv/config";

type BaseConfigType = {
  NODE_ENV: string;
};

export const BaseConfig: BaseConfigType = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
