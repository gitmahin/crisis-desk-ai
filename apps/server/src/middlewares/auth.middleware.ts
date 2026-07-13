import { AuthConfig } from "@/config";
import { postgres } from "@/libs";
import { ACCESS_TOKEN_EXPIRY_SEC, CookieService } from "@/services/cookie.server";
import { usersTable } from "@repo/database";
import { ApiError, ApiResponse, getSystemCustomErrorMsgByKey } from "@repo/shared";
import { eq } from "drizzle-orm";
import type { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken"

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email: string, role: string }
        }
    }
}


export const AuthMiddlware = async (req: Request,
    res: Response,
    next: NextFunction) => {

    try {
        const incomingRefreshToken = req.cookies?.[CookieService.REFRESH_TOKEN.name]
        const incomingAccessToken = req.cookies?.[CookieService.ACCESS_TOKEN.name]

        if (incomingAccessToken) {
            try {
                const decode_access_token = await jwt.verify(incomingAccessToken, AuthConfig.JWT_ACCESS_TOKEN) as { id: string, email: string, role: string }
                if (decode_access_token.role == "ADMIN") {
                    req.user = { id: decode_access_token.id, email: decode_access_token.email, role: decode_access_token.role }
                    next()
                }
            } catch { }

        }

        if (!incomingRefreshToken) {
            throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!)
        }

        let decoded: { id: string }
        try {
            decoded = jwt.verify(
                incomingRefreshToken,
                AuthConfig.JWT_REFRESH_TOKEN,
            ) as { id: string }
        } catch (err) {
            throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!)
        }

        // Here redis should be implemented. fetch data from redis
        const [existingUser] = await postgres
            .select({
                id: usersTable.id,
                email: usersTable.email,
                role: usersTable.role
            })
            .from(usersTable)
            .where(eq(usersTable.id, decoded.id))

        if (!existingUser) {
            throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!)
        }

        const accessToken = jwt.sign(
            { id: existingUser.id, email: existingUser.email, role: existingUser.role },
            AuthConfig.JWT_ACCESS_TOKEN,
            { expiresIn: ACCESS_TOKEN_EXPIRY_SEC }
        )



        res.cookie(CookieService.ACCESS_TOKEN.name, accessToken, CookieService.ACCESS_TOKEN.cookie)

        req.user = { id: decoded.id, email: existingUser.email as string, role: existingUser.role as string }
        next()
        return res.status(200).json(new ApiResponse(200, "OK", {}))

    } catch (error) {
        throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!)
    }
}