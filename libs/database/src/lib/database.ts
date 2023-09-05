import { MongoClient } from 'mongodb';
import { AdminUser } from '@lems/types';
import { randomString } from '@lems/utils';

const connectionString = process.env.MONGODB_URI || 'mongodb://127.0.0.1';
const port = process.env.MONGODB_PORT || 27101;

const initDbClient = async () => {
  const client = new MongoClient(`${connectionString}:${port}`);

  try {
    await client.connect();
  } catch (err) {
    console.error('❌ Unable to connect to mongodb: ', err);
  }
  console.log('🚀 MongoDB Client connected.');

  return client;
};

const client = await initDbClient();
// Add client specific code here (listeners etc)

const db = client.db('lems');

// TODO: do we want schema validation on our mongodb?
// https://www.mongodb.com/docs/manual/core/schema-validation/

const admins = db.collection<AdminUser>('admins');
admins.findOne({}).then((user) => {
  if (!user) {
    const adminUsername = 'admin';
    const adminPassword = randomString(8);
    admins
      .insertOne({
        username: adminUsername,
        password: adminPassword,
        lastPasswordSetDate: new Date(),
      })
      .then(() => {
        console.log(
          `⚙️ Setup initial admin user with details - ${adminUsername}:${adminPassword}`
        );
      });
  }
});

export default db;
