/**
 * File-based JSON database (no external DB required)
 * Stores users, integration configs, and dossiers as JSON files in /data/
 *
 * In production, swap this for Postgres/Supabase/PlanetScale.
 */

import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import type { UserIntegrations, StoredDossier, UserRecord } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── Users ─────────────────────────────────────────────────────────────────

const usersFile = path.join(DATA_DIR, "users.json");

export function getUsers(): UserRecord[] {
  return readJson<UserRecord[]>(usersFile, []);
}

export function getUserById(id: string): UserRecord | undefined {
  return getUsers().find((u) => u.id === id);
}

export function getUserByEmail(email: string): UserRecord | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<UserRecord> {
  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email already registered");
  }
  const hashed = await bcrypt.hash(password, 12);
  const user: UserRecord = {
    id: uuidv4(),
    name,
    email,
    passwordHash: hashed,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
  };
  users.push(user);
  writeJson(usersFile, users);
  return user;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<UserRecord | null> {
  const user = getUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

// ─── Integrations ───────────────────────────────────────────────────────────

function integrationsFile(userId: string) {
  return path.join(DATA_DIR, "integrations", `${userId}.json`);
}

export function getUserIntegrations(userId: string): UserIntegrations {
  return readJson<UserIntegrations>(integrationsFile(userId), {
    userId,
    updatedAt: new Date().toISOString(),
  });
}

export function saveUserIntegrations(
  userId: string,
  data: Partial<UserIntegrations>
): UserIntegrations {
  const existing = getUserIntegrations(userId);
  const updated: UserIntegrations = {
    ...existing,
    ...data,
    userId,
    updatedAt: new Date().toISOString(),
  };
  writeJson(integrationsFile(userId), updated);
  return updated;
}

// ─── Dossiers ───────────────────────────────────────────────────────────────

function dossiersDir(userId: string) {
  return path.join(DATA_DIR, "dossiers", userId);
}

export function getUserDossiers(userId: string): StoredDossier[] {
  const dir = dossiersDir(userId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) =>
      readJson<StoredDossier>(path.join(dir, f), null as unknown as StoredDossier)
    )
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
}

export function getDossierById(
  userId: string,
  dossierId: string
): StoredDossier | undefined {
  const filePath = path.join(dossiersDir(userId), `${dossierId}.json`);
  return readJson<StoredDossier | undefined>(filePath, undefined);
}

export function saveDossier(userId: string, dossier: StoredDossier): StoredDossier {
  const dir = dossiersDir(userId);
  ensureDir(dir);
  const filePath = path.join(dir, `${dossier.id}.json`);
  writeJson(filePath, dossier);
  return dossier;
}

export function updateDossierSection(
  userId: string,
  dossierId: string,
  updates: Partial<StoredDossier>
): StoredDossier | null {
  const existing = getDossierById(userId, dossierId);
  if (!existing) return null;
  const updated: StoredDossier = {
    ...existing,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  saveDossier(userId, updated);
  return updated;
}

export function deleteDossier(userId: string, dossierId: string): boolean {
  const filePath = path.join(dossiersDir(userId), `${dossierId}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

