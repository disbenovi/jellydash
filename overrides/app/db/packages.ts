import fs from 'fs';
import path from 'path';

// Reconstructed (upstream ships app/db gitignored). See overrides/README.md.
// app/db holds roles.json, ratings.json, libraries/, ordered-views, webhook-secret.json
// and image files. Runtime data lives under the app/db dir mounted as a volume.

export const DB_DIR = path.join(process.cwd(), 'app', 'db');

export type Role = {
  id: string;
  name: string;
  maxParentalRating: string | null;
};

export type Rating = {
  id: string;
  label: string;
  value: string;
};

export type OrderedView = {
  id: string;
  name: string;
};

const ROLES_FILE = path.join(DB_DIR, 'roles.json');
const RATINGS_FILE = path.join(DB_DIR, 'ratings.json');
const LIBRARIES_DIR = path.join(DB_DIR, 'libraries');
const ORDERED_VIEWS_FILE = path.join(DB_DIR, 'ordered-views');
const EXCLUDED_LIBRARIES_FILE = path.join(LIBRARIES_DIR, 'EXCLUDED');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch (error) {
    console.error(`Error reading ${path.basename(filePath)}:`, error);
  }
  return fallback;
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ---- roles / library files (packages) ----

export function getRoles(): Role[] {
  return readJson<Role[]>(ROLES_FILE, []);
}

export function saveRoles(roles: Role[]) {
  writeJson(ROLES_FILE, roles);
}

export const EXCLUDED_LIBRARIES_PATH = EXCLUDED_LIBRARIES_FILE;

// Library membership files are `id->name` per line, parsed by parseLibraries().
export function getRoleLibraryFile(roleId: string): string {
  ensureDir(LIBRARIES_DIR);
  return path.join(LIBRARIES_DIR, `${roleId}.txt`);
}

// Returns library ids (strings) contained in the standard role's file.
export function getLibraries(roleLibraryFile: string): string[] {
  return fs
    .readFileSync(roleLibraryFile, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('->'))
    .map((line) => line.split('->')[0].trim());
}

// Seeds a default "standard" role + per-role library files from the Jellyfin
// virtual folders on first sync. No-op once roles.json exists.
export function ensureDefaultRoles(libraries: Array<{ id: string; name: string }>) {
  ensureDir(LIBRARIES_DIR);

  const roles = getRoles();
  if (roles.length > 0) {
    return;
  }

  const defaultRole: Role = { id: 'standard', name: 'Standard', maxParentalRating: null };
  saveRoles([defaultRole]);

  const file = getRoleLibraryFile(defaultRole.id);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, libraries.map((lib) => `${lib.id}->${lib.name}`).join('\n') + '\n');
  }
}

function parseLibraryIds(filePath: string): string[] {
  try {
    return fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('->'))
      .map((line) => line.split('->')[0].trim());
  } catch {
    return [];
  }
}

// Jellyfin access policy fields for a role, applied when creating a user.
export function getRolePolicy(role: Role): Record<string, unknown> {
  const excludedIds = parseLibraryIds(EXCLUDED_LIBRARIES_FILE);
  const roleLibraries = getLibraries(getRoleLibraryFile(role.id));

  return {
    IsAdministrator: false,
    IsHidden: true,
    IsDisabled: false,
    MaxParentalRating: role.maxParentalRating ? Number(role.maxParentalRating) : null,
    BlockedTags: [],
    AllowedTags: [],
    BlockUnratedItems: [],
    AccessSchedules: [],
    EnableUserPreferenceAccess: true,
    EnableRemoteControlOfOtherUsers: false,
    EnableSharedDeviceControl: true,
    EnableRemoteAccess: true,
    EnableLiveTvManagement: false,
    EnableLiveTvAccess: true,
    EnableMediaPlayback: true,
    EnableAudioPlaybackTranscoding: true,
    EnableVideoPlaybackTranscoding: true,
    EnablePlaybackRemuxing: true,
    ForceRemoteSourceTranscoding: false,
    EnableContentDeletion: false,
    EnableContentDeletionFromFolders: [],
    EnableContentDownloading: true,
    EnableSyncTranscoding: true,
    EnableMediaConversion: false,
    EnabledDevices: [],
    EnableAllDevices: true,
    EnabledChannels: [],
    EnableAllChannels: true,
    EnableCollectionManagement: false,
    EnableSubtitleManagement: false,
    EnableLyricManagement: false,
    EnabledFolders: roleLibraries,
    EnableAllFolders: false,
    InvalidLoginAttemptCount: 5,
    LoginAttemptsBeforeLockout: 5,
    MaxActiveSessions: 10,
    EnablePublicSharing: false,
    BlockedMediaFolders: excludedIds.filter((id) => !roleLibraries.includes(id)),
    BlockedChannels: [],
    RemoteClientBitrateLimit: 0,
    SyncPlayAccess: 'CreateAndJoinGroups'
  };
}

// Saved home screen order from the reorder-home page.
export function getOrderedViews(): OrderedView[] {
  return readJson<OrderedView[]>(ORDERED_VIEWS_FILE, []);
}

export function saveOrderedViews(views: OrderedView[]) {
  writeJson(ORDERED_VIEWS_FILE, views);
}