import { cookies } from "next/headers";

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  return token?.value || null;
}

export async function getTokenType(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenType = cookieStore.get("token_type");
  return tokenType?.value || null;
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  const tokenType = await getTokenType();

  if (!token) {
    return {};
  }

  return {
    Authorization: `${tokenType || "Bearer"} ${token}`,
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}
