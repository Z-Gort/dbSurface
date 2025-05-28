import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const createContext = async () => {
  const { getUser } = getKindeServerSession();
  return { user: await getUser() };
};

export type Context = Awaited<ReturnType<typeof createContext>>;