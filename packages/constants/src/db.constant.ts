export const SUPPORTED_LANGUAGES = [
    "BN",
    "EN"
] as const

export const REPORT_CATEGORY = [
    "MEDICAL",
    "FIRE",
    "ACCIDENT",
    "CRIME",
    "FLOOD",
    "UTILITY",
    "PUBLIC_SERVICE",
    "INFRASTRUCTURE",
    "OTHER",
] as const

export const USER_ROLE = [
    "ADMIN",
    "USER"
] as const

export const REPORT_STATUS = [
    "PENDING",
    "IN_REVIEW",
    "ASSIGNED",
    "RESOLVED",
    "REJECTED",
] as const

export const REPORT_URGENCY = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
]