import {createSession, getUserData, deleteSession} from './operations';
import {log} from './utils';

const operations = {
  createSession,
  getUserData,
  deleteSession,
} as const;

export function messageListenerWithOrigin(event: ExtendableMessageEvent | MessageEvent): void {
  if (event.origin !== location.origin) return;

  return messageListener(event);
}

export function messageListener(event: ExtendableMessageEvent | MessageEvent): void {
  log('📨', event.data.type, event.data.fnName, event.data);

  if (event.data.type === 'call') {
    if (event.data.fnName in operations) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = operations[event.data.fnName as keyof typeof operations] as any;
      const target = event.source ?? globalThis;

      fn(...event.data.options).then(
          (result: unknown) => {
            if (result instanceof Response) {
              result.arrayBuffer().then((data) => {
                log('✅ 🌐', event.data.type, event.data.fnName, data);
                target.postMessage(
                    {
                      key: event.data.caller,
                      response: {
                        data,
                        status: result.status,
                        statusText: result.statusText,
                        headers: Array.from(result.headers.entries()),
                      },
                    },
                    {transfer: [data]}
                );
              }, console.error);

              return;
            }
            log('✅', event.data.type, event.data.fnName, result);
            target.postMessage({key: event.data.caller, result});
          },
          (error: Error) => {
            log('❌', event.data.type, event.data.fnName, error);
            target.postMessage({key: event.data.caller, error: error.message});
          }
      );
    }
  } else if (event.data.type === 'ping') {
    const target = event.source ?? globalThis;

    log('🏓', event.data.type);
    target.postMessage({type: 'pong'});
  }
}
