type Resolve<T> = (value?: T | PromiseLike<T>) => void;

type Reject = (reason?: any) => void;

type Options = {
  upstream?: boolean;
  downstream?: boolean;
  self?: boolean;
};

type Source<T> = (event: string, value?: T, options?: Options) => void;

type Listener<T> = (value?: T) => void;

type Listen<T, R> = (event: string, listener: Listener<T>) => R;

type Setter<T> = (key: string, value?: T, options?: Options) => void;

type Getter<T> = (key: string, defaultValue?: T) => void;

type Hooks<T, V> = {
  emit: Source<T>;
  event: Source<T>;
  broadcast: Source<T>;
  on: Listen<T, void>;
  set: Setter<V>;
  get: Getter<V>;
};

type Executor<A, T, V> = (
  resolve: Resolve<A>,
  reject: Reject,
  hooks: Hooks<T, V>
) => void;

type OnFulfilled<A, B, T, V> = (
  value: A,
  hooks: Hooks<T, V>
) => B | PromiseLike<B>;

type OnRejected<T, V> = (reason: any, hooks: Hooks<T, V>) => PromiseLike<never>;

type OnSettled<T, V> = (hooks: Hooks<T, V>) => void;

export {
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
  Setter,
  Getter,
};
