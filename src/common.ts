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

type Hooks<T> = {
  emit: Source<T>;
  event: Source<T>;
  broadcast: Source<T>;
  on: Listen<T, void>;
};

type Executor<A, T> = (
  resolve: Resolve<A>,
  reject: Reject,
  hooks: Hooks<T>
) => void;

type OnFulfilled<A, B, T> = (value: A, hooks: Hooks<T>) => B | PromiseLike<B>;

type OnRejected<T> = (reason: any, hooks: Hooks<T>) => PromiseLike<never>;

type OnSettled<T> = (hooks: Hooks<T>) => void;

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
};
