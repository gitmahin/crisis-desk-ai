import "dotenv/config"
type AuthConfigType = {
    JWT_ACCESS_TOKEN: string
    JWT_REFRESH_TOKEN: string
}

export const AuthConfig: AuthConfigType = {
     JWT_ACCESS_TOKEN: process.env.JWT_ACCESS_TOKEN_SECRET!,
    JWT_REFRESH_TOKEN: process.env.JWT_REFRESH_TOKEN_SECRET!
}