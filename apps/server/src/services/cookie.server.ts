

export const ACCESS_TOKEN_EXPIRY_MIN = 5
export const REFRESH_TOKEN_EXPIRY_DAY = 30

export const ACCESS_TOKEN_EXPIRY_SEC = 5 * 60 // 5 min
export const REFRESH_TOKEN_EXPIRY_SEC = REFRESH_TOKEN_EXPIRY_DAY * 24 * 60 * 60 // 30 days



/**
 * Represents a cookie configuration including its name and options.
 */
type CookieType = {
    name: string;
    cookie: any;
};

/**
 * Service providing centralized configuration for application cookies.
 *
 * This class defines the standard settings for authentication tokens,
 * ensuring consistency in security attributes like `httpOnly`, `secure`, and `sameSite`.
 */
export class CookieService {
    /**
     * Configuration for the Refresh Token cookie.
     * Valid for 7 days.
     */
    static REFRESH_TOKEN: CookieType = {
        name: "refreshToken",
        cookie: {
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: REFRESH_TOKEN_EXPIRY_SEC, // 30 days
        },
    };

    /**
     * Configuration for the Access Token cookie.
     * Valid for 15 minutes.
     */
    static ACCESS_TOKEN: CookieType = {
        name: "accessToken",
        cookie: {
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: ACCESS_TOKEN_EXPIRY_SEC, // 5 min
        },
    };
}