import { createAuthClient } from "@shinederu/auth-core";

export const authClient = createAuthClient({
  baseUrl: import.meta.env.VITE_SHINEDERU_API_AUTH_URL,
});
