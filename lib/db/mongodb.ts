import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoIndexPromises?: Map<string, Promise<void>>;
};

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured. Add your MongoDB connection string to .env.local.");
  }

  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = new MongoClient(uri).connect().catch((error: unknown) => {
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  }
  return globalForMongo.mongoClientPromise;
}

export async function getMongoDatabase(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(process.env.MONGODB_DB_NAME || "continuumai");
  const key = `${process.env.MONGODB_DB_NAME || "continuumai"}:indexes`;
  globalForMongo.mongoIndexPromises ??= new Map();

  let indexes = globalForMongo.mongoIndexPromises.get(key);
  if (!indexes) {
    indexes = Promise.all([
      db.collection("users").createIndex({ emailNormalized: 1 }, { unique: true }),
      db.collection("integrations").createIndex({ userId: 1 }, { unique: true }),
      db.collection("dossiers").createIndex({ ownerId: 1, id: 1 }, { unique: true }),
      db.collection("dossiers").createIndex({ ownerId: 1, generatedAt: -1 }),
    ]).then(() => undefined).catch((error: unknown) => {
      globalForMongo.mongoIndexPromises?.delete(key);
      throw error;
    });
    globalForMongo.mongoIndexPromises.set(key, indexes);
  }

  await indexes;
  return db;
}
