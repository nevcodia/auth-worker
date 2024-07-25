import {getAuthState} from "./state";
import {log} from "./utils";
import {refreshToken} from "./fetch";
import {deleteSession} from "./operations";
import {ping} from "../utils/postMessage";

const NEXT_SYNC = 2000;
const NEXT_PING = 5000;

declare const self: ServiceWorkerGlobalScope;

export const updateOnlineStatus = async () => {
  if (navigator.onLine) {
    log('🌐 Browser Activity,', "online");
    // Retry syncing
    await registerBackgroundSync('check-token-expiration');
    await registerBackgroundSync('ping-pong');
  } else {
    log('🌐 Browser Activity,', "offline");
  }
}

export async function syncListener(event) {
  if (event.tag === 'check-token-expiration') {
    event.waitUntil(checkTokenExpiration().then((tl) => scheduleNextSync(tl)));
  } else if (event.tag === 'ping-pong') {
    event.waitUntil(pinging().then(() => scheduleNextPing()));
  }
}

export const checkTokenExpiration = async (): Promise<number> => {
  const state = await getAuthState();

  const expiresAt = state?.session?.expiresAt;
  if (expiresAt === undefined || expiresAt === 0) {
    log('🔐 token sync,', "login required");
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

export const pinging = async (): Promise<void> => {
  await ping();
  //await sendMessageToClient({type: 'ping'});
};

export const scheduleNextSync = async (timeLeft: number): Promise<void> => {
  if (timeLeft < NEXT_SYNC && timeLeft > 0)
    await new Promise(resolve => setTimeout(resolve, timeLeft));
  else
    await new Promise(resolve => setTimeout(resolve, NEXT_SYNC));
  try {
    //@ts-ignore
    await registerBackgroundSync('check-token-expiration');
  } catch (error) {
    console.error('🔐 token sync,', "failed to schedule next sync", error);
  }
};

export const scheduleNextPing = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, NEXT_PING));
  try {
    //@ts-ignore
    await registerBackgroundSync('ping-pong');
  } catch (error) {
    console.error('🔐 sync,', "failed to schedule next ping", error);
  }
};

export const registerBackgroundSync = async (key: string) => {
  //@ts-ignore
  await self.registration.sync.register(key);
}

export const sendMessageToClient = async (message: any) => {
  const clients = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});
  clients.forEach(client => client.postMessage(message));
};