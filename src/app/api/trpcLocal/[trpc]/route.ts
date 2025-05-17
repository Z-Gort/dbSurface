import { appRouterLocal } from '~/server/trpcLocal';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpcLocal',
    req,
    router: appRouterLocal,
    createContext: () => ({}),
  });

export { handler as GET, handler as POST };