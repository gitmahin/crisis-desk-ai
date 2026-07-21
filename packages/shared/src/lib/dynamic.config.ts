import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const AWS_REGION = ["ap-south-1"];

const smmClient = new SSMClient({ region: AWS_REGION[0] });

/**
 * Fetches a decrypted value from AWS SSM Parameter Store.
 *
 * @param key - The name of the parameter to fetch.
 * @param bypassCache - If true, ignores the local cache and hits AWS directly.
 * @returns {Promise<string | undefined>} The parameter value or undefined if not found.
 *
 * @example
 * const dbPassword = await getSsmValue("/prod/db/password");
 */
export const getSmmValue = async (key: string) => {
  const input = {
    // GetParameterRequest
    Name: key, // required
    WithDecryption: true,
  };
  const getParameterCommand = new GetParameterCommand(input);
  const response = await smmClient.send(getParameterCommand);

  return response.Parameter?.Value;
};
