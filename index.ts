// deno-lint-ignore-file no-explicit-any
import { asyncIterToStream, streamToAsyncIter } from 'https://ghuc.cc/qwtel/whatwg-stream-to-async-iter/index.ts';
import { concatUint8Arrays } from 'https://ghuc.cc/qwtel/typed-array-utils/index.ts'
import { aMap, aJoin, collect, promiseToStream, ForAwaitable } from './iter.ts';

export type StreamBodyInit = ForAwaitable<string> | ReadableStream<string>;
export type ByteStreamBodyInit = ForAwaitable<Uint8Array> | ReadableStream<Uint8Array>;

const maybeAsyncIterToStream = <T>(x: ForAwaitable<T> | ReadableStream<T>) =>
  x instanceof ReadableStream ? x : asyncIterToStream(x);

const maybeStreamToAsyncIter = <T>(x: ForAwaitable<T> | ReadableStream<T>) =>
  x instanceof ReadableStream ? streamToAsyncIter(x) : x;

// FIXME: add exception for newer versions that support streams correctly!?
const isCFWorkers = (<any>globalThis.navigator)?.userAgent?.includes('Cloudflare-Workers')
  || !('TextEncoderStream' in globalThis)

// CF Workers doesn't support non-binary Transform Streams, 
// so we use a version that does the byte encoding in a async iterator instead:
const stringStreamToByteStream: (body: StreamBodyInit) => ReadableStream<Uint8Array> = isCFWorkers
  ? body => {
    const encoder = new TextEncoder();
    return asyncIterToStream(aMap(maybeStreamToAsyncIter(body), x => encoder.encode(x)))
  }
  : body => maybeAsyncIterToStream(body).pipeThrough(new TextEncoderStream())

const CONTENT_TYPE = 'content-type'
const OCTET_STREAM = 'application/octet-stream'

export class StreamResponse extends Response {
  constructor(body?: StreamBodyInit | null, init?: ResponseInit) {
    super(body && stringStreamToByteStream(body), init)
    if (!this.headers.has(CONTENT_TYPE)) this.headers.set(CONTENT_TYPE, OCTET_STREAM)
  }
}

export class ByteStreamResponse extends Response {
  constructor(body?: ByteStreamBodyInit | null, init?: ResponseInit) {
    super(body && maybeAsyncIterToStream(body), init)
    if (!this.headers.has(CONTENT_TYPE)) this.headers.set(CONTENT_TYPE, OCTET_STREAM)
  }
}

/**
 * If for any reason you don't want to use streaming response bodies, 
 * you can use this class instead, which will buffer the entire body before releasing it to the network.
 * Note that headers will still be sent immediately.
 */
export class BufferedStreamResponse extends Response {
  constructor(body?: StreamBodyInit | null, init?: ResponseInit) {
    super(body && promiseToStream(
      aJoin(maybeStreamToAsyncIter(body)).then(str => new TextEncoder().encode(str))
    ), init);
    if (!this.headers.has(CONTENT_TYPE)) this.headers.set(CONTENT_TYPE, OCTET_STREAM)
  }
}

export class BufferedByteStreamResponse extends Response {
  constructor(body?: ByteStreamBodyInit | null, init?: ResponseInit) {
    super(body && promiseToStream(
      collect(maybeStreamToAsyncIter(body)).then(chunks => concatUint8Arrays(...chunks))
    ), init);
    if (!this.headers.has(CONTENT_TYPE)) this.headers.set(CONTENT_TYPE, OCTET_STREAM)
  }
}

export { BufferedStreamResponse as BufferedResponse }

export type StreamRequestInit = Omit<RequestInit, 'body'> & { body?: StreamBodyInit }
export type ByteStreamRequestInit = Omit<RequestInit, 'body'> & { body?: ByteStreamBodyInit }

export class StreamRequest extends Request {
  constructor(input: RequestInfo, init?: StreamRequestInit) {
    const { body, ...rest } = init || {};
    super(input, {
      ...body ? { body: stringStreamToByteStream(body) } : {},
      ...rest,
    });
    if (body && !this.headers.has(CONTENT_TYPE)) this.headers.set(CONTENT_TYPE, OCTET_STREAM)
  }
}

export class ByteStreamRequest extends Request {
  constructor(input: RequestInfo, init?: ByteStreamRequestInit) {
    const { body, ...rest } = init || {};
    super(input, {
      ...body ? { body: maybeAsyncIterToStream(body) } : {},
      ...rest,
    });
    if (body && !this.headers.has(CONTENT_TYPE)) this.headers.set(CONTENT_TYPE, OCTET_STREAM)
  }
}

// TODO: BufferedStreamRequest...
// TODO: BufferedByteStreamRequest...
