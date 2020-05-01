import isFunction from "lodash.isfunction";
import get from "lodash.get";
import set from "lodash.set";
import merge from "lodash.merge";
import {
  OnFulfilled,
  OnRejected,
  OnSettled,
  Executor,
  Resolve,
  Hooks,
  Listener,
  Options,
  Listen,
  Source,
  Getter,
  Setter,
} from "./common";
import { EventEmitter } from "events";

interface Values<V> {
  [key: string]: V;
}

const cast = <A, B>(value: A) => {
  const tmp: any = <any>value;
  return <B>tmp;
};

const defaultOptions = {
  upstream: false,
  downstream: false,
  self: true,
};

const createEvent = <T>(
  emitter: EventEmitter,
  upstream: __Internal<any, T, any>,
  downstream: __Internal<any, T, any>[]
): Source<T> => (type: string, value?: T, options: Options = {}) => {
  const opts = merge({}, defaultOptions, options);
  if (opts.self) emitter.emit(type, value);
  if (opts.upstream && upstream)
    upstream.event(type, value, { ...opts, self: true, downstream: false });
  if (opts.downstream) {
    downstream.forEach((down) =>
      down.event(type, value, { ...opts, self: true, upstream: false })
    );
  }
};

const createSet = <V>(
  values: Values<V>,
  upstream: __Internal<any, any, V>,
  downstream: __Internal<any, any, V>[]
): Setter<V> => (key: string, value?: V, options: Options = {}) => {
  const opts = merge({}, defaultOptions, options);
  if (opts.self) set(values, key, value);
  if (opts.upstream && upstream)
    upstream.set(key, value, { ...opts, self: true, downstream: false });
  if (opts.downstream)
    downstream.forEach((down) =>
      down.set(key, value, { ...opts, self: true, upstream: false })
    );
};

const createGet = <V>(values: Values<V>) => (key: string, defaultValue?: V) =>
  get(values, key, defaultValue);

const createEmit = <T>(source: Source<T>) => (
  type: string,
  value?: T,
  options?: Options
) => source(type, value, { downstream: true, ...options });

const createBroadcast = <T>(source: Source<T>) => (
  type: string,
  value?: T,
  options?: Options
) => source(type, value, { upstream: true, downstream: true, ...options });

const hooks = <T, V>(
  event: Source<T>,
  on: Listen<T, void>,
  set: Setter<V>,
  get: Getter<V>
): Hooks<T, V> => ({
  emit: createEmit(event),
  broadcast: createBroadcast(event),
  event,
  on,
  set,
  get,
});

const createClosure = <T, V>(__upstream: __Internal<any, T, V>) => {
  const __values = {};
  const __emitter = new EventEmitter();
  const __downstream = [];
  const __event: Source<T> = createEvent(__emitter, __upstream, __downstream);
  const __on: Listen<T, void> = (type, listener) =>
    __emitter.on(type, listener);
  const __set: Setter<V> = createSet(__values, __upstream, __downstream);
  const __get: Getter<V> = createGet(__values);
  return { __values, __emitter, __downstream, __event, __on, __set, __get };
};

class __Internal<A, T, V> {
  private readonly __emitter: EventEmitter;
  private readonly __values: Values<V>;
  private readonly promise: Promise<A>;
  private readonly __downstream: __Internal<any, T, V>[];
  private readonly __upstream: __Internal<any, T, V>;

  constructor(
    promiser?: Executor<A, T, V> | PromiseLike<A> | A,
    values: Values<V> = {},
    emitter: EventEmitter = new EventEmitter(),
    upstream?: __Internal<any, T, V>,
    downstream: __Internal<any, T, V>[] = []
  ) {
    this.__values = values;
    this.__emitter = emitter;
    this.__upstream = upstream;
    this.__downstream = downstream;

    this.promise = new Promise((resolve: Resolve<A>, reject) => {
      if (isFunction(promiser))
        (<Executor<A, T, V>>promiser)(
          resolve,
          reject,
          hooks(this.event, this.on, this.set, this.get)
        );
      else resolve(<PromiseLike<A> | A>promiser);
    });
  }

  event: Source<T> = (type: string, value?: T, options?: Options) =>
    createEvent(this.__emitter, this.__upstream, this.__downstream)(
      type,
      value,
      options
    );

  emit: Source<T> = createEmit(this.event);

  broadcast: Source<T> = createBroadcast(this.event);

  on: Listen<T, this> = (event: string, listener: Listener<T>) => {
    this.__emitter.on(event, listener);
    return this;
  };

  set: Setter<V> = (key: string, value?: V, options?: Options) => {
    return createSet(this.__values, this.__upstream, this.__downstream)(
      key,
      value,
      options
    );
  };

  get: Getter<V> = (key: string, defaultValue?: V) =>
    createGet(this.__values)(key, defaultValue);

  then = <B>(
    onFulfilled?: OnFulfilled<A, B, T, V>,
    onRejected?: OnRejected<T, V>
  ): __Internal<B, T, V> => {
    const {
      __event,
      __on,
      __emitter,
      __values,
      __downstream,
      __set,
      __get,
    } = createClosure(this);

    const __hooks = hooks(__event, __on, __set, __get);
    const __onFulfilled = isFunction(onFulfilled)
      ? (value?: A) => onFulfilled(value, __hooks)
      : undefined;
    const __onRejected = isFunction(onFulfilled)
      ? (reason?: any) => onRejected(reason, __hooks)
      : undefined;
    const __then = this.promise.then(__onFulfilled, __onRejected);
    const __cast: __Internal<B, T, V> = cast(
      new __Internal<B, T, V>(__then, __values, __emitter, this, __downstream)
    );
    this.__downstream.push(__cast);
    return __cast;
  };

  catch = (onRejected?: OnRejected<T, V>): __Internal<A, T, V> => {
    const {
      __event,
      __on,
      __emitter,
      __values,
      __downstream,
      __set,
      __get,
    } = createClosure(this);
    const __onRejected = isFunction(onRejected)
      ? (reason: any) => onRejected(reason, hooks(__event, __on, __set, __get))
      : undefined;
    const __catch = this.promise.catch(__onRejected);
    const __cast: __Internal<A, T, V> = cast(
      new __Internal<A, T, V>(__catch, __values, __emitter, this, __downstream)
    );
    this.__downstream.push(__cast);
    return __cast;
  };

  finally = (onSettled?: OnSettled<T, V>): __Internal<A, T, V> => {
    const {
      __event,
      __on,
      __emitter,
      __values,
      __downstream,
      __set,
      __get,
    } = createClosure(this);
    const __onSettled = isFunction(onSettled)
      ? () => onSettled(hooks(__event, __on, __set, __get))
      : undefined;
    const __finally = this.promise.finally(__onSettled);
    const __cast: __Internal<A, T, V> = cast(
      new __Internal<A, T, V>(
        __finally,
        __values,
        __emitter,
        this,
        __downstream
      )
    );
    return __cast;
  };
}

export default __Internal;
