let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  // If we have a valid token, return it
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Twitch access token');
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('Error getting Twitch access token:', error);
    throw error;
  }
}

export async function validateStream(channelName) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to validate Twitch stream');
    }

    const data = await response.json();
    return data.data.length > 0; // Returns true if stream is live
  } catch (error) {
    console.error('Error validating Twitch stream:', error);
    throw error;
  }
}

export async function getStreamInfo(channelName) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${channelName}`,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Twitch stream info');
    }

    const data = await response.json();
    return data.data[0]; // Returns user information
  } catch (error) {
    console.error('Error getting Twitch stream info:', error);
    throw error;
  }
}