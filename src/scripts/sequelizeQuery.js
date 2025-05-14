import { QueryTypes, Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const userId = 'CJBPPL';

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

sequelize
  .query('SELECT id, encodedId FROM users WHERE encodedId = :userId', {
    replacements: { userId },
    type: QueryTypes.SELECT,
    raw: true,
  })
  .then(result => {
    console.log(result);
    sequelize.close();
  })
  .catch(error => {
    console.error(error);
    sequelize.close();
  });
