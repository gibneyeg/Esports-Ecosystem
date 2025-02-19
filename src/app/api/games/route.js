import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const gamesDirectory = path.join(process.cwd(), 'public/games');
    const files = fs.readdirSync(gamesDirectory);
    
    const games = files
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

    return NextResponse.json(games);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}