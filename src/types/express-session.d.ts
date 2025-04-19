// src/types/express-session.d.ts
import session from "express-session";

declare module "express-session" {
    interface Session {
        userId?: string; // Add userId to the session interface
    }
}
