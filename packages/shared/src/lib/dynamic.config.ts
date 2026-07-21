import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const AWS_REGION = ["ap-south-1"];

const smmClient = new SSMClient({ region: AWS_REGION[0] });

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
