import dotenv from 'dotenv';
import {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import { fromIni } from '@aws-sdk/credential-providers';

// argv[0] = runtime
// argv[1] = filename
const stage = process.argv[2];

// dotenv.config({ path: `.env.${stage}` });
dotenv.config();

const lambdaFunctionNames = [
  'auth-login-complete',
  'get-report-comment',
  'get-health-report',
  'get-exercise-recommendations',
  'save-fcm-device-token',
  'auth-oauth-authorize',
];

const client = new LambdaClient({
  region: 'ap-northeast-2',
  credentials: fromIni({ profile: 'dayinbloom' }),
});

lambdaFunctionNames.forEach(async functionName => {
  const command = new UpdateFunctionConfigurationCommand({
    FunctionName: functionName,
    Environment: {
      Variables: {
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_USER: process.env.DB_USER,
        FITBIT_CLIENT_ID: process.env.FITBIT_CLIENT_ID,
        FITBIT_CLIENT_SECRET: process.env.FITBIT_CLIENT_SECRET,
      },
    },
  });

  const { FunctionArn } = await client.send(command);
  console.log(FunctionArn);
});
