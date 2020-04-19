import { isFunction } from "lodash";

import __Internal from "./internals";
import {
  OnFulfilled,
  OnRejected,
  Executor,
  Resolve,
  Reject,
  Hooks,
  Listener,
  Options,
  Listen,
  Source,
  OnSettled,
} from "./common";

class Hooked<A, T> {
  private readonly internal: __Internal<A, T>;

  constructor(
    promiser?: Executor<A, T> | __Internal<A, T> | PromiseLike<A> | A
  ) {
    this.internal =
      promiser instanceof __Internal
        ? promiser
        : new __Internal<A, T>(promiser);
  }

  event: Source<T> = (type: string, value?: T, options: Options = {}) =>
    this.internal.event(type, value, options);
  emit: Source<T> = (type: string, value?: T, options: Options = {}) =>
    this.internal.emit(type, value, options);
  broadcast: Source<T> = (type: string, value?: T, options: Options = {}) =>
    this.internal.broadcast(type, value, options);
  on: Listen<T, this> = (event: string, listener: Listener<T>) => {
    this.internal.on(event, listener);
    return this;
  };

  then = <B>(
    onFulfilled?: OnFulfilled<A, B, T>,
    onRejected?: OnRejected<T>
  ): Hooked<B, T> => {
    const internal: __Internal<B, T> = this.internal.then(
      onFulfilled,
      onRejected
    );
    return new Hooked(internal);
  };

  catch = (onRejected?: OnRejected<T>): Hooked<A, T> => {
    const internal: __Internal<A, T> = this.internal.catch(onRejected);
    return new Hooked(internal);
  };

  finally = (onSettled?: OnSettled<T>): Hooked<A, T> => {
    const internal: __Internal<A, T> = this.internal.finally(onSettled);
    return new Hooked(internal);
  };
}

export default Hooked;
