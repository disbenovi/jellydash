import fs from 'fs';
import path from 'path';

// Reconstructed (upstream ships app/db gitignored). See overrides/README.md.
// Settings JSON lives at app/db/watchlist-settings.json; uploaded images under app/db/images/.

export type WatchlistSettings = {
  moviesPlaylistName: string;
  playlistsViewName: string;
};

const SETTINGS_FILE = path.join(process.cwd(), 'app', 'db', 'watchlist-settings.json');
const IMAGES_DIR = path.join(process.cwd(), 'app', 'db', 'images');
const MOVIES_IMAGE_FILE = path.join(IMAGES_DIR, 'movies-playlist.jpg');
const PLAYLISTS_VIEW_IMAGE_FILE = path.join(IMAGES_DIR, 'playlists-view.jpg');

const DEFAULT_SETTINGS: WatchlistSettings = {
  moviesPlaylistName: 'Watchlist Movies',
  playlistsViewName: 'Playlists'
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getWatchlistSettings(): WatchlistSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return {
        moviesPlaylistName: typeof data.moviesPlaylistName === 'string' ? data.moviesPlaylistName : DEFAULT_SETTINGS.moviesPlaylistName,
        playlistsViewName: typeof data.playlistsViewName === 'string' ? data.playlistsViewName : DEFAULT_SETTINGS.playlistsViewName
      };
    }
  } catch (error) {
    console.error('Error reading watchlist-settings.json:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveWatchlistSettings(patch: Partial<WatchlistSettings>) {
  ensureDir(path.dirname(SETTINGS_FILE));
  const merged = { ...getWatchlistSettings(), ...patch };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
}

export function getMoviesPlaylistImagePath(): string | null {
  return fs.existsSync(MOVIES_IMAGE_FILE) ? MOVIES_IMAGE_FILE : null;
}

export function getPlaylistsViewImagePath(): string | null {
  return fs.existsSync(PLAYLISTS_VIEW_IMAGE_FILE) ? PLAYLISTS_VIEW_IMAGE_FILE : null;
}

function imageToDataUrl(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

export function getMoviesPlaylistImageUrl(): string | null {
  return imageToDataUrl(MOVIES_IMAGE_FILE);
}

export function getPlaylistsViewImageUrl(): string | null {
  return imageToDataUrl(PLAYLISTS_VIEW_IMAGE_FILE);
}

export function saveMoviesPlaylistImage(bytes: Buffer) {
  ensureDir(IMAGES_DIR);
  fs.writeFileSync(MOVIES_IMAGE_FILE, bytes);
}

export function savePlaylistsViewImage(bytes: Buffer) {
  ensureDir(IMAGES_DIR);
  fs.writeFileSync(PLAYLISTS_VIEW_IMAGE_FILE, bytes);
}