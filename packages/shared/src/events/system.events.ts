enum SYSTEM_CUSTOM_ERROR_EVENTS {
  "INTERNAL_SERVER_ERROR" = "INTERNAL_SERVER_ERROR",
  "CREATE_REPORT_PAYLOAD_ERROR" = "CREATE_REPORT_PAYLOAD_ERROR",
  "UPDATE_REPORT_STS_PAYLOAD_ERROR" = "UPDATE_REPORT_STS_PAYLOAD_ERROR",
  "GET_REPORT_BY_ID_PAYLOAD_ERROR" = "GET_REPORT_BY_ID_PAYLOAD_ERROR",
  "GET_REPORT_BY_QUERY_PAYLOAD_ERROR" = "GET_REPORT_BY_QUERY_PAYLOAD_ERROR"
}

export const SystemCustomErrorCode: Record<SYSTEM_CUSTOM_ERROR_EVENTS, string> =
{
  INTERNAL_SERVER_ERROR: "50000",
  CREATE_REPORT_PAYLOAD_ERROR: "40001",
  UPDATE_REPORT_STS_PAYLOAD_ERROR: "40002",
  GET_REPORT_BY_ID_PAYLOAD_ERROR: "40003",
  GET_REPORT_BY_QUERY_PAYLOAD_ERROR: "40004",
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
  [SystemCustomErrorCode.INTERNAL_SERVER_ERROR]: {
    title: "Unexpected Error",
    message:
      "Something went wrong on our end. Please try again later or contact support if the issue persists.",
    code: SystemCustomErrorCode.INTERNAL_SERVER_ERROR,
  },
  [SystemCustomErrorCode.CREATE_REPORT_PAYLOAD_ERROR]: {
    title: "Invalid Report Details",
    message:
      "The information provided is incorrect or incomplete. Please check your inputs and try again.",
    code: SystemCustomErrorCode.CREATE_REPORT_PAYLOAD_ERROR,
  },
  [SystemCustomErrorCode.UPDATE_REPORT_STS_PAYLOAD_ERROR]: {
    title: "Invalid Status Update",
    message:
      "We couldn't update the report status. Please ensure the report ID is correct and the selected status is valid.",
    code: SystemCustomErrorCode.UPDATE_REPORT_STS_PAYLOAD_ERROR,
  },
  [SystemCustomErrorCode.GET_REPORT_BY_ID_PAYLOAD_ERROR]: {
    title: "Invalid Report ID",
    message:
      "The report ID provided is invalid. Please check the identifier and try again.",
    code: SystemCustomErrorCode.GET_REPORT_BY_ID_PAYLOAD_ERROR,
  },
  [SystemCustomErrorCode.GET_REPORT_BY_QUERY_PAYLOAD_ERROR]: {
    title: "Invalid Search Filters",
    message:
      "The filters provided (category or urgency) are not recognized. Please check your selection and try again.",
    code: SystemCustomErrorCode.GET_REPORT_BY_QUERY_PAYLOAD_ERROR,
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
  return SystemCustomErrorMsgByCode[SystemCustomErrorCode[key]];
};
