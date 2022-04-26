import { asyncIterableToStream } from 'https://ghuc.cc/qwtel/whatwg-stream-to-async-iter/index.ts';
import { aMap, aJoin, promiseToAsyncIterable, ForOfAwaitable } from './iter.ts';

// deno-lint-ignore no-explicit-any
const isCFWorkers = (<any>self.navigator)?.userAgent?.includes('Cloudflare-Workers')
  || !('TextEncoderStream' in self)

/**
 * TBD
 */
export class StreamResponse extends Response {
  constructor(body: ForOfAwaitable<string>, init?: ResponseInit) {
    // CF Workers doesn't support non-binary Transform Streams, 
    // so we use a version that does the byte encoding in a async iterator instead:
    super(isCFWorkers 
      ? (() => {
        const encoder = new TextEncoder();
        return asyncIterableToStream(aMap(body, x => encoder.encode(x)))
      })()
      : asyncIterableToStream(body).pipeThrough(new TextEncoderStream()), init)
  }
}

/**
 * TBD
 */
export class ByteStreamResponse extends Response {
  constructor(body: ForOfAwaitable<Uint8Array>, init?: ResponseInit) {
    super(asyncIterableToStream(body), init)
  }
}

/**
 * If for any reason you don't want to use streaming response bodies, 
 * you can use this class instead, which will buffer the entire body before releasing it to the network.
 * Note that headers will still be sent immediately.
 */
export class BufferedResponse extends Response {
  constructor(body: ForOfAwaitable<string>, init?: ResponseInit) {
    super(asyncIterableToStream(promiseToAsyncIterable(
      aJoin(body).then(str => new TextEncoder().encode(str)))
    ), init);
  }
}

// export class BufferedByteResponse extends Response {
//   constructor(body: AsyncIterable<Uint8Array>, init?: ResponseInit) {
//     super(asyncIterableToStream(promiseToAsyncIterable(
//       aConsume(body).then(xs => concatUint8Arrays(...xs)))
//     ), init);
//   }
// }
