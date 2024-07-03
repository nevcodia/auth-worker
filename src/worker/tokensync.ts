import {getAuthState} from "./state";
import {log} from "./utils";
import {refreshToken} from "./fetch";
import {deleteSession} from "./operations";

declare const self: ServiceWorkerGlobalScope;

export async function tokenSyncListener(event) {
  if (event.tag === 'check-token-expiration') {
    event.waitUntil(checkTokenExpiration().then((tl) => scheduleNextSync(tl)));
  }
}

export const checkTokenExpiration = async (): Promise<number> => {
  const state = await getAuthState();

  const expiresAt = state?.session?.expiresAt;
  if (expiresAt === undefined || expiresAt === 0) {
    await sendMessageToClient({type: 'LOGIN_REQUIRED', data: "havelsan"}); //TODO "havelsan" will not be static. CHANGE IT!
    return -1;
  }
  const currentTime = Date.now();

  const timeLeft = expiresAt - currentTime;

  if (timeLeft <= 0) {
    log('🔐 token sync,', "token expired");
    try {
      await refreshToken();
    } catch {
      await sendMessageToClient({type: 'LOGIN_REQUIRED', data: state?.session?.provider});
      await deleteSession();
      return -1;
    }
  } else {
    log('🔐 token sync,', "token valid");
  }

  return timeLeft;
};

export const scheduleNextSync = async (timeLeft: number): Promise<void> => {
  if (timeLeft < 60000 && timeLeft > 0)
    await new Promise(resolve => setTimeout(resolve, timeLeft));
  else
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute
  try {
    //@ts-ignore
    await self.registration.sync.register('check-token-expiration');
    log('🔐 token sync,', "scheduled to next sync");
  } catch (error) {
    console.error('🔐 token sync,', "failed to schedule next sync", error);
  }
};

const sendMessageToClient = async (message: any) => {
  const clients = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});
  clients.forEach(client => client.postMessage(message));
};