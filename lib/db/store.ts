import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import type { Document } from "mongodb";
import type { UserIntegrations, StoredDossier, UserRecord } from "@/types";
import { getMongoDatabase } from "@/lib/db/mongodb";

export const INTEGRATION_SECRET_MASK = "••••••••";
const INTEGRATION_SECRET_KEYS = new Set([
  "token",
  "apiToken",
  "appPassword",
  "botToken",
  "userToken",
  "accessToken",
  "apiKey",
  "zoomApiKey",
  "zoomApiSecret",
  "googleDocsToken",
]);

type UserDocument = UserRecord & Document & { emailNormalized: string };
type IntegrationDocument = UserIntegrations & Document;
type DossierDocument = StoredDossier & Document;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toUserRecord(document: UserDocument): UserRecord {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => key !== "_id" && key !== "emailNormalized")
  ) as UserRecord;
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

// ─── Users ─────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<UserRecord[]> {
  const db = await getMongoDatabase();
  const users = await db.collection<UserDocument>("users")
    .find({}, { projection: { emailNormalized: 0 } })
    .toArray();
  return users.map(toUserRecord);
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  if (!id) return undefined;
  const db = await getMongoDatabase();
  const user = await db.collection<UserDocument>("users")
    .findOne({ id }, { projection: { emailNormalized: 0 } });
  return user ? toUserRecord(user) : undefined;
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const emailNormalized = email.trim().toLowerCase();
  if (!emailNormalized) return undefined;
  const db = await getMongoDatabase();
  const user = await db.collection<UserDocument>("users")
    .findOne({ emailNormalized }, { projection: { emailNormalized: 0 } });
  return user ? toUserRecord(user) : undefined;
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<UserRecord> {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName || !normalizedEmail || password.length < 8) {
    throw new Error("Name, valid email, and a password of at least 8 characters are required.");
  }

  const db = await getMongoDatabase();
  const users = db.collection<UserDocument>("users");
  if (await users.findOne({ emailNormalized: normalizedEmail }, { projection: { _id: 1 } })) {
    throw new Error("Email already registered");
  }

  const user: UserRecord = {
    id: uuidv4(),
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedName)}`,
  };

  try {
    await users.insertOne({ ...user, emailNormalized: normalizedEmail });
  } catch (error) {
    if (isDuplicateEmailError(error)) throw new Error("Email already registered");
    throw error;
  }
  return user;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<UserRecord | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  return await bcrypt.compare(password, user.passwordHash) ? user : null;
}

// ─── Integrations ───────────────────────────────────────────────────────────

export async function getUserIntegrations(userId: string): Promise<UserIntegrations> {
  const db = await getMongoDatabase();
  const integration = await db.collection<IntegrationDocument>("integrations")
    .findOne({ userId });
  if (!integration) {
    return { userId, updatedAt: new Date().toISOString() };
  }
  return Object.fromEntries(
    Object.entries(integration).filter(([key]) => key !== "_id")
  ) as UserIntegrations;
}

function mergeIntegrationConfig(
  existing: unknown,
  incoming: unknown,
  key = ""
): unknown {
  if (
    INTEGRATION_SECRET_KEYS.has(key) &&
    incoming === INTEGRATION_SECRET_MASK &&
    typeof existing === "string"
  ) {
    return existing;
  }

  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return incoming;
  }

  const previous =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const next = incoming as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...next };

  for (const secretKey of INTEGRATION_SECRET_KEYS) {
    if (!(secretKey in next) && typeof previous[secretKey] === "string") {
      merged[secretKey] = previous[secretKey];
    }
  }
  for (const [field, value] of Object.entries(next)) {
    merged[field] = mergeIntegrationConfig(previous[field], value, field);
  }
  return merged;
}

export function maskIntegrationSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskIntegrationSecrets);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      INTEGRATION_SECRET_KEYS.has(key) && fieldValue
        ? INTEGRATION_SECRET_MASK
        : maskIntegrationSecrets(fieldValue),
    ])
  );
}

export async function saveUserIntegrations(
  userId: string,
  data: Partial<UserIntegrations>
): Promise<UserIntegrations> {
  const existing = await getUserIntegrations(userId);
  const merged: Record<string, unknown> = { ...existing, ...data };
  for (const [section, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      merged[section] = mergeIntegrationConfig(
        (existing as unknown as Record<string, unknown>)[section],
        value
      );
    }
  }
  const updated: UserIntegrations = {
    ...(merged as unknown as UserIntegrations),
    userId,
    updatedAt: new Date().toISOString(),
  };
  const db = await getMongoDatabase();
  await db.collection<IntegrationDocument>("integrations").replaceOne(
    { userId },
    updated,
    { upsert: true }
  );
  return updated;
}

// ─── Dossiers ───────────────────────────────────────────────────────────────

export async function getUserDossiers(userId: string): Promise<StoredDossier[]> {
  const db = await getMongoDatabase();
  const dossiers = await db.collection<DossierDocument>("dossiers")
    .find({ ownerId: userId })
    .sort({ generatedAt: -1 })
    .toArray();
  return dossiers.map((dossier) => Object.fromEntries(
    Object.entries(dossier).filter(([key]) => key !== "_id")
  ) as StoredDossier);
}

export async function getDossierById(
  userId: string,
  dossierId: string
): Promise<StoredDossier | undefined> {
  if (!isUuid(dossierId)) return undefined;
  const db = await getMongoDatabase();
  const dossier = await db.collection<DossierDocument>("dossiers")
    .findOne({ ownerId: userId, id: dossierId });
  if (!dossier) return undefined;
  return Object.fromEntries(
    Object.entries(dossier).filter(([key]) => key !== "_id")
  ) as StoredDossier;
}

export async function saveDossier(
  userId: string,
  dossier: StoredDossier
): Promise<StoredDossier> {
  if (!isUuid(dossier.id)) throw new Error("Invalid dossier ID");
  if (dossier.ownerId !== userId) throw new Error("Dossier owner does not match");
  const db = await getMongoDatabase();
  await db.collection<DossierDocument>("dossiers").replaceOne(
    { ownerId: userId, id: dossier.id },
    dossier,
    { upsert: true }
  );
  return dossier;
}

export async function updateDossierSection(
  userId: string,
  dossierId: string,
  updates: Partial<StoredDossier>
): Promise<StoredDossier | null> {
  if (!isUuid(dossierId)) return null;
  const db = await getMongoDatabase();
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => key !== "id" && key !== "ownerId")
  );
  const result = await db.collection<DossierDocument>("dossiers").updateOne(
    { ownerId: userId, id: dossierId },
    {
      $set: {
        ...safeUpdates,
        lastUpdated: new Date().toISOString(),
      },
    }
  );
  if (!result.matchedCount) return null;
  return (await getDossierById(userId, dossierId)) ?? null;
}

export async function deleteDossier(
  userId: string,
  dossierId: string
): Promise<boolean> {
  if (!isUuid(dossierId)) return false;
  const db = await getMongoDatabase();
  const result = await db.collection<DossierDocument>("dossiers")
    .deleteOne({ ownerId: userId, id: dossierId });
  return result.deletedCount > 0;
}
