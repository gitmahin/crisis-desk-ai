enum SYSTEM_CUSTOM_ERROR_EVENTS {
  "USER_DUP_EMAIL" = "USER_DUP_EMAIL",
  "USER_DUP_USRNAME" = "USER_DUP_USRNAME",
  "INTERNAL_SERVER_ERROR" = "INTERNAL_SERVER_ERROR",
}

export const SystemCustomErrorCode: Record<SYSTEM_CUSTOM_ERROR_EVENTS, string> =
  {
    USER_DUP_EMAIL: "10001",
    USER_DUP_USRNAME: "10002",
    INTERNAL_SERVER_ERROR: "50000",
  };

type SystemCustomErrorMessageDataType = {
  title?: string;
  message: string;
  code: string;
};

type SystemCustomErrorMessageType = {
  [key: string]: SystemCustomErrorMessageDataType;
};

/**
 * Lookup table for system-wide error messages.
 *
 * @description Translates internal error codes into structured objects
 * containing a display title, a detailed message, and the original code.
 *
 * @example
 * const error = SystemCustomErrorMessageByCodes[SystemCustomErrorCode.USER_DUP_EMAIL];
 * return res.status(500).json(error);
 */
export const SystemCustomErrorMsgByCode: SystemCustomErrorMessageType = {
  [SystemCustomErrorCode.USER_DUP_EMAIL]: {
    title: "User Already Exists",
    message: "A user with this email already exists.",
    code: SystemCustomErrorCode.USER_DUP_EMAIL,
  },
  [SystemCustomErrorCode.USER_DUP_USRNAME]: {
    title: "User Already Exists",
    message: "A user with this username already exists.",
    code: SystemCustomErrorCode.USER_DUP_USRNAME,
  },
  [SystemCustomErrorCode.INTERNAL_SERVER_ERROR]: {
    title: "Unexpected Error",
    message:
      "Something went wrong on our end. Please try again later or contact support if the issue persists.",
    code: SystemCustomErrorCode.INTERNAL_SERVER_ERROR,
  },
};

/**
 * Retrieves structured error metadata (title, message, and code) for a specific error key.
 *
 * This utility is primarily used for sending error events by key not error code
 *
 * @param key - The unique identifier from `SYSTEM_CUSTOM_ERROR_EVENTS`.
 * @returns The corresponding error object containing display text and the error code.
 *
 * @example
 * // Displaying a toast message when a database error occurs
 * const errorInfo = getSystemCustomErrorMsgByKey(SYSTEM_CUSTOM_ERROR_EVENTS.DB_CONNECTION_ERROR);
 *
 * return res.status(400).json({error: errorInfo})
 */
export const getSystemCustomErrorMsgByKey = (
  key: keyof typeof SYSTEM_CUSTOM_ERROR_EVENTS
) => {
  return SystemCustomErrorMsgByCode[key];
};
