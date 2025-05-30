import { z } from "zod";

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

export async function getToken(): Promise<string> {
  const response = await fetch(`https://dbsurface.kinde.com/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      audience: "https://dbsurface.kinde.com/api",
      grant_type: "client_credentials",
      client_id: process.env.KINDE_M2M_CLIENT_ID!,
      client_secret: process.env.KINDE_M2M_CLIENT_SECRET!,
    }),
  });


  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const json = tokenResponseSchema.parse(await response.json());

  return json.access_token;
}

export async function deleteUser(kindeId: string, token: string) {
  const response = await fetch(
    `https://dbsurface.kinde.com/api/v1/user?id=${kindeId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    console.log("response", response);
    throw new Error(`Response status: ${response.status}`);
  }
}
