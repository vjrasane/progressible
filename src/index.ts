import { noop, isFunction } from "lodash";

type Listener<B> = (value: B) => void;

type Broadcast<B> = (value: B) => void;

type Resolve<R> = (value?: R | PromiseLike<R>) => void;

type OnFulfilled<R, T, B> = (
  value: R,
  progress: Broadcast<B>
) => T | PromiseLike<T>;

type Reject = (reason?: any) => void;

type Subscribe<B> = (listener: Listener<B>) => ProgressPromise<any, B>;

type Executor<R, T> = (
  resolve: Resolve<R>,
  reject: Reject,
  broadcast: Broadcast<T>
) => void;

const broadcast = <B>(
  listeners: Listener<B>[],
  reject: Reject
): Broadcast<B> => (value: B) => {
  try {
    listeners.forEach((listen) => listen(value));
  } catch (error) {
    reject(error);
  }
};

const cast = <A, B>(value: A) => {
  const tmp: any = <any>value;
  return <B>tmp;
};

class ProgressPromise<R, B> {
  readonly listeners: Listener<B>[];
  private readonly subscribe: Subscribe<B>;
  private readonly promise: Promise<R>;
  private __resolve: Resolve<R>;
  private __reject: (reason?: any) => void;

  get [Symbol.toStringTag]() {
    return "ProgressPromise";
  }

  constructor(
    promiser?: Executor<R, B> | Promise<R>,
    subscribe: Subscribe<B> = noop,
    listeners: Listener<B>[] = []
  ) {
    this.listeners = listeners;
    this.promise = new Promise((resolve: Resolve<R>, reject) => {
      this.__resolve = resolve;
      this.__reject = reject;
      if (isFunction(promiser))
        (<Executor<R, B>>promiser)(
          resolve,
          reject,
          broadcast(this.listeners, reject)
        );
      else resolve(<Promise<R>>promiser);
    });
    this.subscribe = subscribe;
  }

  progress: Subscribe<B> = (listener: Listener<B>) => {
    this.listeners.push(listener);
    this.subscribe(listener);
    return this;
  };

  then = <T>(
    onFulfilled?: OnFulfilled<R, T, B>,
    onRejected?: (reason: any) => PromiseLike<never>
  ): ProgressPromise<R, T> => {
    const listeners = [];
    const __onFulfilled = (value: R) =>
      onFulfilled(value, broadcast(listeners, this.__reject));
    const then = this.promise.then(
      isFunction(onFulfilled) && __onFulfilled,
      onRejected
    );
    return cast(new ProgressPromise(then, this.progress, listeners));
  };

  catch = (onRejected?: Reject) => this.promise.catch(onRejected);

  resolve: Resolve<R> = (value?: R | PromiseLike<R>): void =>
    this.__resolve(value);

  reject: Reject = (reason?: any): void => this.__reject(reason);
}

export default ProgressPromise;
