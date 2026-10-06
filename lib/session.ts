/**
 * Name of the "signed in" cookie, shared by lib/auth.ts (browser, sets/clears it)
 * and proxy.ts (server, reads it). Kept free of browser-only code so both can import it.
 */
export const SESSION_COOKIE = "tenda_session";
