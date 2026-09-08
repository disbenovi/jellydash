import fs from 'fs';
import path from 'path';

// Reconstructed (upstream ships app/db gitignored). See overrides/README.md.

export type Rating = {
  id: string;
  label: string;
  value: string;
};

const RATINGS_FILE = path.join(process.cwd(), 'app', 'db', 'ratings.json');

export function getRatings(): Rating[] {
  try {
    if (fs.existsSync(RATINGS_FILE)) {
      return JSON.parse(fs.readFileSync(RATINGS_FILE, 'utf-8')) as Rating[];
    }
  } catch (error) {
    console.error('Error reading ratings.json:', error);
  }
  return [];
}

export function saveRatings(ratings: Rating[]) {
  const dir = path.dirname(RATINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(RATINGS_FILE, JSON.stringify(ratings, null, 2));
}