import { NextResponse } from 'next/server';

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  try {
    const response = await fetch(
      'https://id.twitch.tv/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'client_credentials'
        })
      }
    );
    if (!response.ok) {
      throw new Error('Failed to get access token');
    }
    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
   
    return data.access_token;
  } catch (error) {
    console.error('Token fetch error:', error);
    throw error;
  }
}

// Base64 encoded SVG placeholder
const placeholderImage = `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533"><rect width="400" height="533" fill="#f3f4f6"/><g transform="translate(125, 191.5)"><path d="M150 0C67.157 0 0 67.157 0 150s67.157 150 150 150 150-67.157 150-150S232.843 0 150 0zm0 270c-66.274 0-120-53.726-120-120S83.726 30 150 30s120 53.726 120 120-53.726 120-120 120z" fill="#d1d5db"/><path d="M135 90h30v30h30v30h-30v30h-30v-30h-30v-30h30V90zm-45 90h120v15H90v-15z" fill="#9ca3af"/></g><text x="200" y="450" text-anchor="middle" font-family="system-ui, -apple-system" font-size="24" fill="#6b7280">No Cover Available</text></svg>`).toString('base64')}`;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '30');
   
    const accessToken = await getAccessToken();
   
    // Query IGDB
    const gamesResponse = await fetch(
      'https://api.igdb.com/v4/games',
      {
        method: 'POST',
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/plain',
        },
        body: `
          ${search ? `search "${search}";` : ''}
          fields name,cover.url,genres.name,first_release_date,total_rating,total_rating_count;
          where version_parent = null & category = 0;
          limit ${limit};
          offset ${offset};
          ${search ? '' : 'sort total_rating desc;'}
        `
      }
    );
    if (!gamesResponse.ok) {
      throw new Error('Failed to fetch games from IGDB');
    }
    const games = await gamesResponse.json();
   
    // Transform the response
    const transformedGames = games.map(game => ({
      id: game.id,
      name: game.name,
      image: game.cover ? game.cover.url.replace('t_thumb', 't_cover_big') : placeholderImage,
      releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null,
      genres: game.genres?.map(genre => genre.name) || [],
      rating: game.total_rating ? Math.round(game.total_rating) : null,
      ratingCount: game.total_rating_count || 0
    }));

    // Get total count
    const countResponse = await fetch(
      'https://api.igdb.com/v4/games/count',
      {
        method: 'POST',
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/plain',
        },
        body: `
          ${search ? `search "${search}";` : ''}
          where version_parent = null & category = 0;
        `
      }
    );
    const { count } = await countResponse.json();
    
    return NextResponse.json({
      games: transformedGames,
      total: count,
      hasMore: offset + limit < count
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}