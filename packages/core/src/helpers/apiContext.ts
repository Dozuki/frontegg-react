import { ContextOptions } from '../interfaces';

/**
 * `@frontegg/rest-api` builds every request URL as `baseUrl` + `urlPrefix` + path, and
 * falls back to the literal `frontegg` for any falsy `urlPrefix` -- so there is no way to
 * ask it for no segment at all. Consumers serving these APIs from their own backend need
 * the whole root under their control, which is what `urlPrefix: ''` means here.
 *
 * We can't stop rest-api appending a segment, so we give it one it already owns: the root
 * split at its final slash. rest-api appends the last segment back and rebuilds exactly
 * the root the caller asked for, with no extra path element.
 */
export const resolveApiContext = <T extends ContextOptions>(context: T): T => {
  if (context.urlPrefix !== '') {
    return context;
  }

  const root = context.baseUrl.replace(/\/+$/, '');
  // Keep the slash with the parent: rest-api only inserts one when the base lacks it.
  const splitAt = root.lastIndexOf('/') + 1;
  const lastSegment = root.slice(splitAt);
  if (!lastSegment) {
    return context;
  }

  return { ...context, baseUrl: root.slice(0, splitAt), urlPrefix: lastSegment };
};
