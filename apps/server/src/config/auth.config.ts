import { getSmmValue } from "@repo/shared";
import "dotenv/config";
type AuthConfigType = {
  JWT_ACCESS_TOKEN: string;
  JWT_REFRESH_TOKEN: string;
};

export const AuthConfig: AuthConfigType = {
  JWT_ACCESS_TOKEN:
    (await getSmmValue("/crsai/prod/jwt_access_secret_key")) ?? "",
  JWT_REFRESH_TOKEN:
    (await getSmmValue("/crsai/prod/jwt_refresh_secret_key")) ?? "",
};
