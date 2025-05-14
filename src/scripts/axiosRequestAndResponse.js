import dotenv from 'dotenv';
import axios from 'axios';
import querystring from 'querystring';

dotenv.config();

async function axiosRequestAndResponse() {
  const requestBody = { grant_type: 'client_credentials' };
  const FITIBIT_OAUTH_AUTHORIZE_URL = `https://api.fitbit.com/oauth2/token`;
  const FITBIT_BASIC_TOKEN = Buffer.from(
    `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
  ).toString('base64');
  try {
    const result = await axios.post(
      FITIBIT_OAUTH_AUTHORIZE_URL,
      querystring.stringify(requestBody),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${FITBIT_BASIC_TOKEN}`,
        },
      }
    );
    console.log(result.data);
  } catch (error) {
    console.error(error.response.data);
  }
}

axiosRequestAndResponse();
