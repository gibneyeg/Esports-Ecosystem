import fs from 'fs';
import path from 'path';

export function getGames() {
  const gamesDirectory = path.join(process.cwd(), 'public/games');
  const files = fs.readdirSync(gamesDirectory);
  
  return files
    .filter(file => file.match(/\.(jpg|jpeg|png)$/i))
    .map(file => {
      const name = file
        .replace(/\.(jpg|jpeg|png)$/i, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return {
        name,
        image: `/games/${file}`
      };
    });
}