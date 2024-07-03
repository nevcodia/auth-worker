import {HttpMethod} from '../interfaces/IAllowList';
import {AuthError} from '../shared/enums';
import {getPkceVerifier} from '../shared/pkce';
import {getState} from '../shared/storage';
import {getLoginUrl} from '../utils';
import {fetchWithCredentials, isAllowedUrl} from './fetch';
import {createSession, deleteSession} from './operations';
import {getAuthState} from './state';
import {generateResponse, log} from './utils';
import {REDIRECT_KEY, getData, saveData} from '../shared/db';

async function intercept(method: HttpMethod, urlString: string): Promise<URL | void> {
  const url = new URL(urlString);
  const state = await getAuthState();

  if (state?.config?.basePath && url.pathname.startsWith(state.config.basePath)) {
    log('🔐 intercept', method, url, url.pathname.replace(state.config.basePath, '').split('/'));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_empty, action, provider, _rest] = url.pathname.replace(state.config.basePath, '').split('/');

    if (action === 'login') {
      const loginUrl = await getLoginUrl(state.config, provider, url.origin);
      const redirect = url?.searchParams.get("redirect_to");
      await saveData(REDIRECT_KEY, redirect && redirect !== "null" ? redirect : "");

      return new URL(loginUrl);
    } else if (action === 'logout') {
      await saveData(REDIRECT_KEY, "");
      await deleteSession();

      // TODO: Add configurable logout URL
      return new URL(state.config.basePath, url.origin);
    } else if (action === 'callback') {
      const hash = url.hash.substring(1);
      const query = url.search.substring(1);
      const params = hash && hash.length > 10 ? hash : query;
      const localState = await getState(provider);
      const pkce = await getPkceVerifier(provider);

      await createSession(params, provider, localState, url.origin, pkce);
      return await getRedirectURL(url);
    } else {
      log('🛑 Invalid request', method, urlString);

      // TODO: Add configurable 404 URL
      return new URL(url.origin);
    }
  }
}

export async function fetchListener(event: FetchEvent) {
  const useAuth = event.request.headers.get('X-Use-Auth');
  const method = event.request.method as HttpMethod;

  if (useAuth) {
    log('🔐 fetch', event.request.method, event.request.url);
    event.respondWith(
        isAllowedUrl(event.request.url, method).then((allowed) => {
          if (allowed) {
            log('🌍 fetch', event.request.method, event.request.url, {auth: Boolean(useAuth)});

            return fetchWithCredentials(event.request);
          }
          return generateResponse({error: AuthError.Unauthorized}, 401);
        })
    );
  } else {
    event.respondWith(
        intercept(method, event.request.url).then((response) => {
          if (response) {
            log('🔐 redirect', response);

            return Response.redirect(response, 302);
          }
          return fetch(event.request);
        })
    );
  }
}

const getRedirectURL = async (url): Promise<URL> => {
  const redirect = await getData(REDIRECT_KEY);
  if (redirect === null || redirect === "") {
    return new URL('/', url.origin);
  } else if (redirect.startsWith("http")) {
    return new URL(redirect);
  } else {
    return new URL(redirect, url.origin);
  }
}
