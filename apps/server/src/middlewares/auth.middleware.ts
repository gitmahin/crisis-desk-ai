import { AuthConfig } from "@/config";
import { postgres } from "@/libs";
import { userRedisService } from "@/redis/user.redis";
import { ACCESS_TOKEN_EXPIRY_SEC, CookieService } from "@/services/cookie.server";
import { usersTable, type PgUserSelectType } from "@repo/database";
import { ApiError, ApiResponse, getSystemCustomErrorMsgByKey } from "@repo/shared";
import { and, eq, sql } from "drizzle-orm";
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

        console.log("cookies are: ", incomingAccessToken, incomingRefreshToken)

        if (incomingAccessToken) {
            try {
                const decode_access_token = await jwt.verify(incomingAccessToken, AuthConfig.JWT_ACCESS_TOKEN) as { id: string, email: string, role: string }
                if (decode_access_token.role == "ADMIN") {
                    req.user = { id: decode_access_token.id, email: decode_access_token.email, role: decode_access_token.role }
                    console.log("Token not refreshed", req.user)
                    return next()
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

        type TempUserType = Pick<PgUserSelectType, "id" | "email" | "role">
        let temp_user: TempUserType;

        const cache_data = await userRedisService.getHashUserLoginInfo(decoded.id) as TempUserType
        // Here redis should be implemented. fetch data from redis

        const prepareExistingUserQuery = await postgres

            .select({
                id: usersTable.id,
                email: usersTable.email,
                role: usersTable.role
            })
            .from(usersTable)
            .where(and(eq(usersTable.id, sql.placeholder("id")), eq(usersTable.role, "ADMIN"))).prepare("prepareExistingUserQuery")

        if (!cache_data) {
            const [result] = await prepareExistingUserQuery.execute({ id: decoded.id })
            temp_user = result as TempUserType
        } else {
            temp_user = {
                id: cache_data.id,
                email: cache_data.email,
                role: cache_data.role
            }
        }

        if (!temp_user) {
            throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!)
        }


        const accessToken = jwt.sign(
            { id: temp_user.id, email: temp_user.email, role: temp_user.role },
            AuthConfig.JWT_ACCESS_TOKEN,
            { expiresIn: ACCESS_TOKEN_EXPIRY_SEC }
        )

        res.cookie(CookieService.ACCESS_TOKEN.name, accessToken, CookieService.ACCESS_TOKEN.cookie)

        req.user = { id: decoded.id, email: temp_user.email as string, role: temp_user.role as string }
        console.log("Token refreshed", req.user)
        return next()
    } catch (error) {
        throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!)
    }
}