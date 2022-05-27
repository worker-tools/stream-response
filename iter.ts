export type Awaitable<T> = T | Promise<T>;
export type ForAwaitable<T> = Iterable<T> | AsyncIterable<T>;
export type { ForAwaitable as ForOfAwaitable }

export const isIterable = <T>(x: unknown): x is Iterable<T> => 
  x != null && typeof x === 'object' && Symbol.iterator in x

export const isAsyncIterable = <T>(x: unknown): x is AsyncIterable<T> => 
  x != null && typeof x === 'object' && Symbol.asyncIterator in x

export const isForAwaitable = <T>(x: unknown): x is ForAwaitable<T> => 
  x != null && typeof x === 'object' && (Symbol.asyncIterator in x || Symbol.iterator in x)

/**
 * Alternates items from the first and second iterable in the output iterable, until either input runs out of items.
 */
export function* interleave<X, Y>(xs: Iterable<X>, ys: Iterable<Y>): IterableIterator<X | Y> {
  const itx = xs[Symbol.iterator]();
  const ity = ys[Symbol.iterator]();
  while (true) {
    const rx = itx.next();
    if (rx.done) break;
    else yield rx.value;
    const ry = ity.next();
    if (ry.done) break;
    else yield ry.value;
  }
}

/**
 * It's like interleave, but will flatten items of the second (async) iterable.
 */
export async function* aInterleaveFlattenSecond<X, Y>(xs: Iterable<X>, ys: Iterable<AsyncIterable<Y>>): AsyncIterableIterator<X | Y> {
  const itx = xs[Symbol.iterator]();
  const ity = ys[Symbol.iterator]();
  while (true) {
    const rx = itx.next();
    if (rx.done) break;
    else yield rx.value;
    const ry = ity.next();
    if (ry.done) break;
    else yield* ry.value;
  }
}

export function* map<A, B>(iterable: Iterable<A>, f: (a: A) => B): IterableIterator<B> {
  for (const x of iterable) yield f(x);
}

export async function* aMap<A, B>(iterable: ForAwaitable<A>, f: (a: A) => Awaitable<B>): AsyncIterableIterator<B> {
  for await (const x of iterable) yield f(x);
}

export function join(iterable: Iterable<string>): string {
  return [...iterable].join('');
}

export async function aJoin(iterable: ForAwaitable<string>): Promise<string> {
  const chunks = [];
  for await (const x of iterable) chunks.push(x);
  return chunks.join('');
}

export async function collect<T>(iterable: ForAwaitable<T>): Promise<T[]> {
  const chunks = [];
  for await (const x of iterable) chunks.push(x);
  return chunks
}

export async function* promiseToAsyncIter<T>(promise: Promise<T>): AsyncIterableIterator<T> {
  yield await promise;
}

export function promiseToStream<T>(promise: Promise<T>): ReadableStream<T> {
  return new ReadableStream({
    async start(ctrl) { 
      try { 
        ctrl.enqueue(await promise); 
        ctrl.close()
      } catch (err) { 
        ctrl.error(err) 
      } 
    }
  })
}
