import { noop, isFunction, isArray, get, set, merge } from "lodash";
import {
  OnFulfilled,
  OnRejected,
  OnSettled,
  Executor,
  Resolve,
  Reject,
  Hooks,
  Listener,
  Options,
  Listen,
  Source,
} from "./common";

interface Listeners<B> {
  [key: string]: Listener<B>[];
}

const defaultOptions: Options = {
  upstream: false,
  downstream: false,
  self: true,
};

const selfEvent = <T>(listeners: Listeners<T>) => (type: string, value?: T) => {
  if (type in listeners && isArray(listeners[type])) {
    (listeners[type] as Listener<T>[]).forEach((listen: Listener<T>) =>
      listen(value)
    );
  }
};

const cast = <A, B>(value: A) => {
  const tmp: any = <any>value;
  return <B>tmp;
};

const event = <T>(
  listeners: Listeners<T>,
  upstream: Source<T>,
  downstream: Source<T>[],
  reject: Reject
): Source<T> => (type: string, value?: T, options: Options = {}) => {
  try {
    const opts = merge({}, defaultOptions, options);
    if (opts.self) selfEvent(listeners)(type, value);
    if (opts.upstream)
      upstream(type, value, { ...opts, self: true, downstream: false });
    if (opts.downstream) {
      downstream.forEach((down) =>
        down(type, value, { ...opts, self: true, upstream: false })
      );
    }
  } catch (error) {
    reject(error);
  }
};

const emit = <T>(source: Source<T>) => (
  type: string,
  value?: T,
  options?: Options
) => source(type, value, { downstream: true, ...options });

const broadcast = <T>(source: Source<T>) => (
  type: string,
  value?: T,
  options?: Options
) => source(type, value, { upstream: true, downstream: true, ...options });

const on = <T>(listeners: Listeners<T>): Listen<T, void> => (
  type: string,
  listener: Listener<T>
) => {
  if (!isFunction(listener))
    throw Error(`Event handler must be a function, was: ${typeof listener}`);
  const list: Listener<T>[] = get(listeners, type, []);
  list.push(listener);
  set(listeners, type, list);
};

const hooks = <T>(event: Source<T>, on: Listen<T, void>): Hooks<T> => ({
  emit: emit(event),
  broadcast: broadcast(event),
  event,
  on,
});

const createClosure = <T>(source: Source<T>, reject: Reject) => {
  const __listeners = {};
  const __downstream = [];
  const __event: Source<T> = event(__listeners, source, __downstream, reject);
  const __on: Listen<T, void> = on(__listeners);
  return { __listeners, __downstream, __event, __on };
};

class __Internal<A, T> {
  private readonly __listeners: Listeners<T>;
  private readonly promise: Promise<A>;
  private readonly __downstream: Source<T>[];
  private readonly __upstream: Source<T>;

  private __resolve: Resolve<A>;
  private __reject: Reject;

  constructor(
    promiser?: Executor<A, T> | PromiseLike<A> | A,
    listeners: Listeners<T> = {},
    upstream: Source<T> = noop,
    downstream: Source<T>[] = []
  ) {
    this.__listeners = listeners;
    this.__upstream = upstream;
    this.__downstream = downstream;

    this.promise = new Promise((resolve: Resolve<A>, reject) => {
      this.__resolve = resolve;
      this.__reject = reject;
      if (isFunction(promiser))
        (<Executor<A, T>>promiser)(resolve, reject, hooks(this.event, this.on));
      else resolve(<PromiseLike<A> | A>promiser);
    });
  }

  event: Source<T> = (type: string, value?: T, options: Options = {}) =>
    event(
      this.__listeners,
      this.__upstream,
      this.__downstream,
      this.__reject
    )(type, value, options);

  emit: Source<T> = emit(this.event);

  broadcast: Source<T> = broadcast(this.event);

  on: Listen<T, this> = (event: string, listener: Listener<T>) => {
    on(this.__listeners)(event, listener);
    return this;
  };

  then = <B>(
    onFulfilled?: OnFulfilled<A, B, T>,
    onRejected?: OnRejected<T>
  ): __Internal<B, T> => {
    const { __event, __on, __listeners, __downstream } = createClosure(
      this.event,
      this.__reject
    );

    const __hooks = hooks(__event, __on);
    const __onFulfilled = isFunction(onFulfilled)
      ? (value?: A) => onFulfilled(value, __hooks)
      : undefined;
    const __onRejected = isFunction(onFulfilled)
      ? (reason?: any) => onRejected(reason, __hooks)
      : undefined;
    const __then = this.promise.then(__onFulfilled, __onRejected);
    this.__downstream.push(__event);
    return cast(
      new __Internal<B, T>(__then, __listeners, this.event, __downstream)
    );
  };

  catch = (onRejected?: OnRejected<T>): __Internal<A, T> => {
    const { __event, __on, __listeners, __downstream } = createClosure(
      this.event,
      this.__reject
    );
    const __onRejected = isFunction(onRejected)
      ? (reason: any) => onRejected(reason, hooks(__event, __on))
      : undefined;
    const __catch = this.promise.catch(__onRejected);
    return cast(
      new __Internal<A, T>(__catch, __listeners, this.event, __downstream)
    );
  };

  finally = (onSettled?: OnSettled<T>): __Internal<A, T> => {
    const { __event, __on, __listeners, __downstream } = createClosure(
      this.event,
      this.__reject
    );
    const __onSettled = isFunction(onSettled)
      ? () => onSettled(hooks(__event, __on))
      : undefined;
    const __finally = this.promise.finally(__onSettled);
    return cast(
      new __Internal<A, T>(__finally, __listeners, this.event, __downstream)
    );
  };
}

export default __Internal;
