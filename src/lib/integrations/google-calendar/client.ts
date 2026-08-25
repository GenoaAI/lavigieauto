/**
 * Google Calendar OAuth2 Client
 */
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export function getGoogleOAuthUrl(redirectUri?: string, state?: string): string {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const finalRedirectUri = redirectUri || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
  const options = {
    redirect_uri: finalRedirectUri,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ].join(" "),
    state: state || "",
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri?: string): Promise<GoogleTokens> {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const finalRedirectUri = redirectUri || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
  const body = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirect_uri: finalRedirectUri,
    grant_type: "authorization_code",
  };

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to exchange Google OAuth code: ${err}`);
  }

  return response.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const body = {
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    grant_type: "refresh_token",
  };

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to refresh Google OAuth token: ${err}`);
  }

  return response.json();
}
