import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const createContext = async () => {
  const { getUser, isAuthenticated } = getKindeServerSession();
  return { user: await getUser(), isAuthenticated: isAuthenticated() };
};

export type Context = Awaited<ReturnType<typeof createContext>>;