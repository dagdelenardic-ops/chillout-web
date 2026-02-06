import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, GoogleAuthProvider } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type FirebaseSource = "env" | "runtime";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  source: FirebaseSource;
  config: FirebasePublicConfig;
};

const REQUIRED_KEYS: Array<keyof FirebasePublicConfig> = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const envFirebaseConfig: Partial<FirebasePublicConfig> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const FIREBASE_RUNTIME_STORAGE_KEY = "chillout_firebase_config";

let cachedServices: FirebaseServices | null = null;
let cachedSignature = "";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFirebaseConfig(value: unknown): Partial<FirebasePublicConfig> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const input = value as Record<string, unknown>;

  return {
    apiKey: asTrimmedString(input.apiKey),
    authDomain: asTrimmedString(input.authDomain),
    projectId: asTrimmedString(input.projectId),
    storageBucket: asTrimmedString(input.storageBucket),
    messagingSenderId: asTrimmedString(input.messagingSenderId),
    appId: asTrimmedString(input.appId),
  };
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function signatureFromConfig(config: FirebasePublicConfig): string {
  return REQUIRED_KEYS.map((key) => config[key]).join("|");
}

function appNameFromConfig(config: FirebasePublicConfig): string {
  const project = config.projectId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
  return `chillout-${project || "runtime"}`;
}

export function isCompleteFirebaseConfig(
  config: Partial<FirebasePublicConfig> | null | undefined
): config is FirebasePublicConfig {
  if (!config) {
    return false;
  }

  return REQUIRED_KEYS.every((key) => asTrimmedString(config[key]).length > 0);
}

export function parseFirebaseConfigInput(
  rawInput: string
): Partial<FirebasePublicConfig> | null {
  const raw = rawInput.trim();
  if (!raw) {
    return null;
  }

  const directJson = tryParseJson(raw);
  if (directJson) {
    return normalizeFirebaseConfig(directJson);
  }

  const objectLike = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!objectLike) {
    return null;
  }

  const jsonLike = objectLike
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,\s*}/g, "}");

  const parsed = tryParseJson(jsonLike);
  if (!parsed) {
    return null;
  }

  return normalizeFirebaseConfig(parsed);
}

export function getRuntimeFirebaseConfig(): Partial<FirebasePublicConfig> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(FIREBASE_RUNTIME_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  return normalizeFirebaseConfig(tryParseJson(raw));
}

function selectResolvedConfig(
  preferredRuntime?: Partial<FirebasePublicConfig> | null
): { config: FirebasePublicConfig; source: FirebaseSource } | null {
  if (isCompleteFirebaseConfig(envFirebaseConfig)) {
    return {
      config: envFirebaseConfig,
      source: "env",
    };
  }

  const runtime = preferredRuntime ?? getRuntimeFirebaseConfig();
  if (isCompleteFirebaseConfig(runtime)) {
    return {
      config: runtime,
      source: "runtime",
    };
  }

  return null;
}

export function getFirebaseServices(
  preferredRuntime?: Partial<FirebasePublicConfig> | null
): FirebaseServices | null {
  const resolved = selectResolvedConfig(preferredRuntime);
  if (!resolved) {
    return null;
  }

  const signature = signatureFromConfig(resolved.config);
  if (cachedServices && cachedSignature === signature) {
    return cachedServices;
  }

  const appName = appNameFromConfig(resolved.config);
  const existingApp = getApps().find((app) => app.name === appName);
  const app = existingApp ?? initializeApp(resolved.config, appName);

  cachedServices = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    source: resolved.source,
    config: resolved.config,
  };
  cachedSignature = signature;

  return cachedServices;
}

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});
