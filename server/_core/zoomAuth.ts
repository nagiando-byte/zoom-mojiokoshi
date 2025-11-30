import axios from 'axios';

/**
 * Zoom OAuth Token Response
 */
interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Cached access token
 */
let cachedToken: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Get Zoom OAuth access token using Server-to-Server OAuth
 * Automatically caches and refreshes the token
 */
export async function getZoomAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom OAuth credentials not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET environment variables.');
  }

  try {
    // Request new access token
    const response = await axios.post<ZoomTokenResponse>(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {},
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in } = response.data;

    // Cache the token (subtract 60 seconds for safety margin)
    cachedToken = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 60) * 1000,
    };

    console.log('[Zoom Auth] Access token obtained successfully');
    return access_token;
  } catch (error) {
    console.error('[Zoom Auth] Failed to obtain access token:', error);
    throw new Error('Failed to authenticate with Zoom API');
  }
}

/**
 * Make an authenticated request to Zoom API
 */
export async function makeZoomRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<T> {
  const token = await getZoomAccessToken();
  const baseUrl = 'https://api.zoom.us/v2';

  try {
    const response = await axios({
      method,
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
    });

    return response.data;
  } catch (error: any) {
    console.error(`[Zoom API] ${method} ${endpoint} failed:`, error.response?.data || error.message);
    throw error;
  }
}
