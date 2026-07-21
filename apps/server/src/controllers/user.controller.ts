import {
  ApiError,
  ApiResponse,
  getSystemCustomErrorMsgByKey,
  validateWithZod,
} from "@repo/shared";
import { userZSchema } from "@repo/zod";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { postgres } from "@/libs";
import { usersTable } from "@repo/database";
import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_EXPIRY_SEC,
  CookieService,
  REFRESH_TOKEN_EXPIRY_SEC,
} from "@/services/cookie.server";
import { eq } from "drizzle-orm";
import { AuthConfig } from "@/config";
import z4 from "zod/v4";
import { connectRedis } from "@/libs/redis";
import { userRedisService } from "@/redis-a/user.redis";

/**
 * Controller responsible for User Identity and Access Management (IAM).
 *
 * Handles registration, authentication, and session persistence
 * across PostgreSQL and Redis.
 */
export class UserController {
  /**
   * Registers a new user and initiates a session.
   *
   * Process:
   * 1. Validate input via Zod.
   * 2. Hash password using Bcrypt (10 salt rounds).
   * 3. Persist to PostgreSQL.
   * 4. Issue JWT tokens and set cookies.
   * 5. Cache session metadata in Redis.
   */
  async createUser(req: Request, res: Response) {
    const payload = req.body;

    const { data, success, error } = validateWithZod(
      payload,
      userZSchema.createUser
    );
    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_USER_INPUT")!,
        "",
        [z4.flattenError(error)]
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hash_password = await bcrypt.hash(data.password, salt);

    const [newUser] = await postgres
      .insert(usersTable)
      .values({
        name: data.email,
        email: data.email,
        password: hash_password,
        role: data.role,
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      });

    if (!newUser) {
      throw new ApiError(503, getSystemCustomErrorMsgByKey("UNKNOWN_ERROR")!);
    }

    const accessToken = jwt.sign(
      { id: newUser?.id, email: newUser.email, role: newUser.role },
      AuthConfig.JWT_ACCESS_TOKEN,
      { expiresIn: ACCESS_TOKEN_EXPIRY_SEC }
    );

    const refreshToken = jwt.sign(
      { id: newUser.id },
      AuthConfig.JWT_REFRESH_TOKEN,
      { expiresIn: REFRESH_TOKEN_EXPIRY_SEC }
    );

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );
    res.cookie(
      CookieService.REFRESH_TOKEN.name,
      refreshToken,
      CookieService.REFRESH_TOKEN.cookie
    );

    await connectRedis();

    // Centralized token and session management
    await userRedisService.hashUserLoginInfo(newUser.id, {
      email: newUser.email as string,
      role: newUser.role,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "OK", { id: newUser?.id }));
  }

  /**
   * Authenticates an existing user via email/password.
   *
   * @remarks
   * Uses a 'Safe-Compare' logic with Bcrypt to prevent timing attacks.
   */
  async loginUser(req: Request, res: Response) {
    const payload = req.query;

    // console.log("here is payload", payload);

    const { data, success, error } = validateWithZod(
      payload,
      userZSchema.loginUser
    );
    if (!success) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_USER_INPUT")!,
        "",
        [z4.flattenError(error)]
      );
    }

    const [existingUser] = await postgres
      .select({
        id: usersTable.id,
        email: usersTable.email,
        password: usersTable.password,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.email, data.email));

    if (!existingUser) {
      throw new ApiError(
        401,
        getSystemCustomErrorMsgByKey("INVALID_CREDENTIALS")!
      );
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      existingUser.password as string
    );
    if (!isPasswordValid) {
      throw new ApiError(
        401,
        getSystemCustomErrorMsgByKey("INVALID_CREDENTIALS")!
      );
    }

    const accessToken = jwt.sign(
      {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      },
      AuthConfig.JWT_ACCESS_TOKEN,
      { expiresIn: ACCESS_TOKEN_EXPIRY_SEC }
    );

    const refreshToken = jwt.sign(
      { id: existingUser.id },
      AuthConfig.JWT_REFRESH_TOKEN,
      { expiresIn: REFRESH_TOKEN_EXPIRY_SEC }
    );

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );
    res.cookie(
      CookieService.REFRESH_TOKEN.name,
      refreshToken,
      CookieService.REFRESH_TOKEN.cookie
    );

    await connectRedis();

    // Centralized token and session management
    await userRedisService.hashUserLoginInfo(existingUser.id, {
      email: existingUser.email as string,
      role: existingUser.role,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "OK", { id: existingUser.id }));
  }
}
