/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import {initAuthServiceWorker} from 'auth-worker/worker';
import {facebook, google, hydra, reddit, twitter} from 'auth-worker/providers';
import {BASE_PATH} from "../constants";

addEventListener('install', () => {
  // @ts-ignore
  skipWaiting();
});

addEventListener('activate', (event) => {
  // @ts-ignore
  event.waitUntil(clients.claim());
});

initAuthServiceWorker(
    {google, facebook, twitter, reddit, havelsan: hydra("infra.net/auth")},
    BASE_PATH + '/auth',
    [`http`]
    // 'foobartest'
);
