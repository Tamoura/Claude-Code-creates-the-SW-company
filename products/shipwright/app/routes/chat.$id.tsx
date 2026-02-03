import { json, redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getAuth } from '@clerk/remix/ssr.server';
import { default as IndexRoute } from './_index';

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect('/sign-in');
  }

  return json({ id: args.params.id });
}

export default IndexRoute;
