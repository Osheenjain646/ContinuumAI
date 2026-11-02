import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Set MONGODB_URI in .env.local before migrating.");
}

const dataRoot = path.resolve("data");
const dbName = process.env.MONGODB_DB_NAME || "continuumai";
const client = new MongoClient(uri);

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function migrate() {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");
  const integrations = db.collection("integrations");
  const dossiers = db.collection("dossiers");

  await users.createIndex({ emailNormalized: 1 }, { unique: true });
  await integrations.createIndex({ userId: 1 }, { unique: true });
  await dossiers.createIndex({ ownerId: 1, id: 1 }, { unique: true });
  await dossiers.createIndex({ ownerId: 1, generatedAt: -1 });

  const legacyUsers = await readJson(path.join(dataRoot, "users.json")) ?? [];
  let userCount = 0;
  for (const user of legacyUsers) {
    if (!user.id || !user.email || !user.passwordHash) {
      throw new Error("A legacy user record is missing its ID, email, or password hash.");
    }
    await users.replaceOne(
      { id: user.id },
      { ...user, emailNormalized: user.email.trim().toLowerCase() },
      { upsert: true }
    );
    userCount += 1;
  }

  let integrationCount = 0;
  const integrationsDir = path.join(dataRoot, "integrations");
  for (const file of await readdir(integrationsDir).catch((error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  })) {
    if (!file.endsWith(".json")) continue;
    const record = await readJson(path.join(integrationsDir, file));
    if (!record?.userId) throw new Error(`Invalid integrations document: ${file}`);
    await integrations.replaceOne({ userId: record.userId }, record, { upsert: true });
    integrationCount += 1;
  }

  let dossierCount = 0;
  const dossiersDir = path.join(dataRoot, "dossiers");
  for (const userId of await readdir(dossiersDir).catch((error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  })) {
    const userDossiers = path.join(dossiersDir, userId);
    for (const file of await readdir(userDossiers)) {
      if (!file.endsWith(".json")) continue;
      const dossier = await readJson(path.join(userDossiers, file));
      if (!dossier?.id || dossier.ownerId !== userId) {
        throw new Error(`Invalid or mismatched dossier owner: ${path.join(userId, file)}`);
      }
      await dossiers.replaceOne(
        { ownerId: userId, id: dossier.id },
        dossier,
        { upsert: true }
      );
      dossierCount += 1;
    }
  }

  console.log(`Migrated ${userCount} users, ${integrationCount} integrations, and ${dossierCount} dossiers into ${dbName}.`);
}

try {
  await migrate();
} finally {
  await client.close();
}
