import { noop, isFunction, isArray, get, set, merge } from "lodash";

type Resolve<R> = (value?: R | PromiseLike<R>) => void;

type Reject = (reason?: any) => void;

type Listener<B> = (value: B) => void;

type Listen<B, R> = (event: string, listener: Listener<B>) => R;

interface Listeners<B> {
  [key: string]: Listener<B>[];
}

type Broadcast<B> = (event: string, value: B, options?: Options) => void;

type Hooks<B> = {
  emit: Broadcast<B>;
  event: Broadcast<B>;
  broadcast: Broadcast<B>;
  on: Listen<B, void>;
};

type OnFulfilled<R, T, B> = (value: R, hooks: Hooks<B>) => T | PromiseLike<T>;

type OnRejected<B> = (reason: any, hooks: Hooks<B>) => PromiseLike<never>;

type BroadcastExecutor<R, B> = (
  resolve: Resolve<R>,
  reject: Reject,
  hooks: Hooks<B>
) => void;

type Options = {
  upstream?: boolean;
  downstream?: boolean;
  self?: boolean;
};

const defaultOptions: Options = {
  upstream: false,
  downstream: false,
  self: true,
};

const selfEvent = <B>(listeners: Listeners<B>) => (type: string, value: B) => {
  if (type in listeners && isArray(listeners[type])) {
    (listeners[type] as Listener<B>[]).forEach((listen: Listener<B>) =>
      listen(value)
    );
  }
};

const cast = <A, B>(value: A) => {
  const tmp: any = <any>value;
  return <B>tmp;
};

const event = <B>(
  listeners: Listeners<B>,
  upstream: Broadcast<B>,
  downstream: Broadcast<B>[],
  reject: Reject
): Broadcast<B> => (type: string, value: B, options: Options = {}) => {
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

const emit = <B>(event: Broadcast<B>) => (
  type: string,
  value: B,
  options: Options = {}
) => event(type, value, { downstream: true, ...options });

const broadcast = <B>(event: Broadcast<B>) => (
  type: string,
  value: B,
  options: Options = {}
) => event(type, value, { upstream: true, downstream: true, ...options });

const on = <B>(listeners: Listeners<B>): Listen<B, void> => (
  type: string,
  listener: Listener<B>
) => {
  if (!isFunction(listener))
    throw Error(`Event handler must be a function, was: ${typeof listener}`);
  const list: Listener<B>[] = get(listeners, type, []);
  list.push(listener);
  set(listeners, type, list);
};

const hooks = <B>(event: Broadcast<B>, on: Listen<B, void>): Hooks<B> => ({
  emit: emit(event),
  broadcast: broadcast(event),
  event,
  on,
});

const createClosure = <B>(selfEvent: Broadcast<B>, reject: Reject) => {
  const __listeners = {};
  const __downstream = [];
  const __event: Broadcast<B> = event(
    __listeners,
    selfEvent,
    __downstream,
    reject
  );
  const __on: Listen<B, void> = on(__listeners);
  return { __listeners, __downstream, __event, __on };
};

class BroadcastPromise<R, B> {
  private readonly __listeners: Listeners<B>;
  private readonly promise: Promise<R>;
  private readonly __downstream: Broadcast<B>[];
  private readonly __upstream: Broadcast<B>;

  private __resolve: Resolve<R>;
  private __reject: Reject;

  constructor(
    promiser?: BroadcastExecutor<R, B> | PromiseLike<R> | R,
    listeners: Listeners<B> = {},
    upstream: Broadcast<B> = noop,
    downstream: Broadcast<B>[] = []
  ) {
    this.__listeners = listeners;
    this.__upstream = upstream;
    this.__downstream = downstream;

    this.promise = new Promise((resolve: Resolve<R>, reject) => {
      this.__resolve = resolve;
      this.__reject = reject;
      if (isFunction(promiser))
        (<BroadcastExecutor<R, B>>promiser)(
          resolve,
          reject,
          hooks(this.event, this.on)
        );
      else resolve(<PromiseLike<R> | R>promiser);
    });
  }

  event: Broadcast<B> = (type: string, value: B, options: Options = {}) =>
    event(
      this.__listeners,
      this.__upstream,
      this.__downstream,
      this.__reject
    )(type, value, options);

  emit: Broadcast<B> = emit(this.event);

  broadcast: Broadcast<B> = broadcast(this.event);

  on: Listen<B, this> = (event: string, listener: Listener<B>) => {
    on(this.__listeners)(event, listener);
    return this;
  };

  then = <T>(
    onFulfilled?: OnFulfilled<R, T, B>,
    onRejected?: OnRejected<B>
  ): BroadcastPromise<T, B> => {
    const { __event, __on, __listeners, __downstream } = createClosure(
      this.event,
      this.__reject
    );

    const __hooks = hooks(__event, __on);
    const __onFulfilled = (value: R) => onFulfilled(value, __hooks);
    const __onRejected = (reason: any) => onRejected(reason, __hooks);
    const __then = this.promise.then(
      isFunction(onFulfilled) && __onFulfilled,
      isFunction(onRejected) && __onRejected
    );
    this.__downstream.push(__event);
    return cast(
      new BroadcastPromise<T, B>(__then, __listeners, this.event, __downstream)
    );
  };

  catch = (onRejected?: OnRejected<B>): BroadcastPromise<R, B> => {
    const { __event, __on, __listeners, __downstream } = createClosure(
      this.event,
      this.__reject
    );
    const __onRejected = (reason: any) =>
      onRejected(reason, hooks(__event, __on));
    const __catch = this.promise.catch(__onRejected);
    return cast(
      new BroadcastPromise<R, B>(__catch, __listeners, this.event, __downstream)
    );
  };

  // TODO: figure out if needed
  // resolve: Resolve<R> = (value?: R | PromiseLike<R>): void =>
  //   this.__resolve(value);

  // reject: Reject = (reason?: any): void => this.__reject(reason);
}

export default BroadcastPromise;
