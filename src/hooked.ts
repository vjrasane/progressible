import __Internal from "./internals";
import {
  OnFulfilled,
  OnRejected,
  Executor,
  Setter,
  Getter,
  Listener,
  Options,
  Listen,
  Source,
  OnSettled,
} from "./common";

class Hooked<A, T, V> {
  private readonly internal: __Internal<A, T, V>;

  constructor(
    promiser?: Executor<A, T, V> | __Internal<A, T, V> | PromiseLike<A> | A
  ) {
    this.internal =
      promiser instanceof __Internal
        ? promiser
        : new __Internal<A, T, V>(promiser);
  }

  event: Source<T> = (type: string, value?: T, options?: Options) =>
    this.internal.event(type, value, options);
  emit: Source<T> = (type: string, value?: T, options?: Options) =>
    this.internal.emit(type, value, options);
  broadcast: Source<T> = (type: string, value?: T, options?: Options) =>
    this.internal.broadcast(type, value, options);
  on: Listen<T, this> = (event: string, listener: Listener<T>) => {
    this.internal.on(event, listener);
    return this;
  };

  set: Setter<V> = (key: string, value?: V, options?: Options) =>
    this.internal.set(key, value, options);
  get: Getter<V> = (key: string, defaultValue?: V) =>
    this.internal.get(key, defaultValue);

  then = <B>(
    onFulfilled?: OnFulfilled<A, B, T, V>,
    onRejected?: OnRejected<T, V>
  ): Hooked<B, T, V> => {
    const internal: __Internal<B, T, V> = this.internal.then(
      onFulfilled,
      onRejected
    );
    return new Hooked(internal);
  };

  catch = (onRejected?: OnRejected<T, V>): Hooked<A, T, V> => {
    const internal: __Internal<A, T, V> = this.internal.catch(onRejected);
    return new Hooked(internal);
  };

  finally = (onSettled?: OnSettled<T, V>): Hooked<A, T, V> => {
    const internal: __Internal<A, T, V> = this.internal.finally(onSettled);
    return new Hooked(internal);
  };
}

export default Hooked;
