import {IConfig} from '../interfaces/IConfig';
import {IWorkerSettings} from '../interfaces/IWorkerSettins';
import {ping, setWorker} from './postMessage';
import {log} from '../worker/utils';

export function loadAuthServiceWorker(
    config: IConfig,
    {
      workerPath = './infra-worker.js',
      scope = '/',
      debug = false,
      patchUnregister = true,
      patchUpdate = true,
      tokenSync = true
    }: IWorkerSettings = {}
) {
  const workerRegistration = window.navigator.serviceWorker.register(
      workerPath +
      '?' +
      new URLSearchParams({
        config: JSON.stringify(config),
        v: '1',
        debug: debug ? '1' : '0',
      }),
      {type: 'module', scope}
  ).catch((error) => {
    console.error('🔐 register', 'Service Worker registration failed:', error);
  });


  if (patchUnregister) {
    workerRegistration.then((registration) => {
      if (registration) {
        registration.unregister = (): Promise<boolean> => {
          throw new Error('Unregistering the service worker is not allowed in this app.');
        };
      }
    });
  }

  if (patchUpdate) {
    workerRegistration.then((registration) => {
      if (registration) {
        registration.update().catch((e) => {
          console.error('Updating the service worker is failed. Details: ', e);
        })
      }
    });
  }

  if (tokenSync) {
    workerRegistration.then((registration) => {
      // Register for background sync
      //@ts-ignore
      return registration.sync.register('check-token-expiration');
    })
    .then(() => {
      log('🔐 background sync', 'first check-token-expiration sync registered');
    })
    .catch((error) => {
      console.error('🔐 background sync', 'Check token expiration registration failed:', error);
    });
  }

  const workerInstance = window.navigator.serviceWorker;

  if (workerInstance) {
    setWorker(workerInstance);

    // setInterval(ping, 5000);

    workerRegistration.then((registration) => {
      // Register for background sync
      //@ts-ignore
      return registration.sync.register('ping-pong');
    })
    .then(() => {
      log('🔐 ping pong', 'first ping-pong sync registered');
    })
    .catch((error) => {
      console.error('🔐 ping pong', 'Check Ping Pong registration failed:', error);
    });
  }

  return workerRegistration;
}
