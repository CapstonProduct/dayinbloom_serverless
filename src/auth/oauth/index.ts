import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios, { AxiosError } from 'axios';
import { DateTime } from 'luxon';
import querystring from 'node:querystring';
import { QueryTypes, Sequelize } from 'sequelize';

interface OAuthResult {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface UserQueryResult {
  id: number;
  encodedId: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // 1. request body 의 userId 검증
  // '누가' 이 람다를 호출했는지는 존나게 중요하기때문에 그걸합시다.
  let userId;
  if (event.body) {
    userId = JSON.parse(event.body).userId;
  }
  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'userId is required' }),
    };
  }

  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await sequelize.authenticate();
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'database connection error',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  try {
    const results = await sequelize.query<UserQueryResult>(
      'SELECT id, encodedId FROM users WHERE encodedId = :userId',
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
        raw: true,
      }
    );
    if (!results || results[0].encodedId !== userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `userId ${userId} is either not found or invalid`,
        }),
      };
    }
  } catch (error) {
    await sequelize.close();
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'database query error',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  // 2. OAuth token POST request를 날려 토큰 받아오기
  const requestBody = { grant_type: 'client_credentials' };
  const FITIBIT_OAUTH_AUTHORIZE_URL = 'https://api.fitbit.com/oauth2/token';
  const FITBIT_BASIC_TOKEN = Buffer.from(
    `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
  ).toString('base64');

  try {
    const { data } = await axios.post<OAuthResult>(
      FITIBIT_OAUTH_AUTHORIZE_URL,
      querystring.stringify(requestBody),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${FITBIT_BASIC_TOKEN}`,
        },
      }
    );

    const { access_token: accessToken, expires_in: expiresInSec } = data;
    const newExpirationTime = DateTime.now()
      .setZone('Asia/Seoul')
      .plus({ seconds: expiresInSec })
      .toFormat('yyyy-MM-dd HH:mm:ss');

    await sequelize.query(
      'UPDATE users SET access_token = :accessToken, access_token_expires = :newExpirationTime WHERE encodedId = :userId',
      {
        replacements: { accessToken, newExpirationTime, userId },
        type: QueryTypes.UPDATE,
      }
    );
    await sequelize.close();

    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken,
        expiresIn: expiresInSec,
        expirationTime: newExpirationTime,
      }),
    };
  } catch (error) {
    await sequelize.close();
    console.error(error);

    let errorMessage;
    let errorDetail;

    if (error instanceof AxiosError) {
      errorMessage = 'OAuth Error';
      errorDetail = error.response ? error.response.data : error.message;
    } else {
      errorMessage = 'Database update error';
      errorDetail = error instanceof Error ? error.message : String(error);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: errorMessage,
        detail: errorDetail,
      }),
    };
  }
};
