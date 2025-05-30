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

  let userId = null;
  let isAuthenticated = false;

  console.log("token", token);

  if (token) {
    try {
      const rawValidation = await validateToken({
        token,
        domain: "https://dbsurface.kinde.com",
      });

      console.log("rawValidation", rawValidation);

      const decoded = jwt.decode(token) as {
        sub?: string;
      } | null;

      if (decoded?.sub) {
        userId = decoded.sub;
        isAuthenticated = rawValidation.valid;
      } else {
        console.warn("JWT decoded but no sub claim:", decoded);
      }
    } catch (err) {
      console.error("JWT validation failed:", err);
    }
  }
  console.log("userId", userId);
  console.log("isAuthenticated", isAuthenticated);

  return { userId, isAuthenticated };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
