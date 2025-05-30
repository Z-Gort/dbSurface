import {
  validateToken,
  type jwtValidationResponse,
} from "@kinde/jwt-validator";
import jwt from "jsonwebtoken";

interface AuthContext {
  userId: string | null;
  isAuthenticated: boolean;
  rawValidation?: jwtValidationResponse;
}

export const createContext = async ({
  req,
}: {
  req: Request;
}): Promise<AuthContext> => {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : "";

  let userId: string | null = null;
  let isAuthenticated = false;

  if (token) {
    try {
      const rawValidation = await validateToken({
        token,
        domain: "https://dbsurface.kinde.com",
      });
      console.log("Kinde JWT validation result:", rawValidation);
      console.log("token", token);

      const decoded = jwt.decode(token) as {
        sub?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [k: string]: any;
      } | null;

      console.log("decoded", decoded)

      if (decoded?.sub) {
        userId = decoded.sub;
        isAuthenticated = true;
      } else {
        console.warn("JWT decoded but no sub claim:", decoded);
      }
    } catch (err) {
      console.error("JWT validation failed:", err);
    }
  }

  return { userId, isAuthenticated };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
