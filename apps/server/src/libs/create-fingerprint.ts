import type { Request } from "express";
import { createHash } from "crypto";

export const createFingerprint = (
    request: Request) => {
    const clientIp = request.clientIp;
    const header = request.header

    // Get security headers
    const fingerprint = [
        header("user-agent"),
        header("accept-language"),
        header("accept-encoding"),
        header("sec-ch-ua") || "",
        header("sec-ch-ua-platform") || "",
        header("sec-ch-ua-mobile") || "",
        header("sec-ch-ua-model") || "",
        header("sec-ch-ua-form-factors") || "",
        clientIp,
    ].join("|");

    // Create hash
    const deviceHash = createHash("sha256").update(fingerprint).digest("hex");
    return deviceHash;
};