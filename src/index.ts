import { isFunction } from "lodash";

type Listener<T> = (value: T) => void;

type Broadcast<T> = (value: T) => void;

type Subscribe<T, R> = (listener: Listener<T>) => ProgressPromise<T, R>;

type Init<T> = (resolve, reject, onProgress: Broadcast<T>) => any;

type ProgressResolve<T, R, N> = (result: R, onProgress: Broadcast<T>) => N;

type ProgressReject<T, E, N> = (error: E, onProgress: Broadcast<T>) => N;

export interface ProgressPromise<T, R> {
  progress: Subscribe<T, R>;
  then: <N>(
    onResolved: ProgressResolve<T, R, N>,
    onRejected?: ProgressReject<T, Error, N>
  ) => ProgressPromise<T, R>;
  catch: <N>(onRejected: ProgressReject<T, Error, N>) => ProgressPromise<T, R>;
}

const cast = <T, R>(promise: Promise<R>): ProgressPromise<T, R> => {
  const _cast = <any>promise;
  return <ProgressPromise<T, R>>_cast;
};

const create = <T, R>(init: Init<T>): ProgressPromise<T, R> => {
  const initialListeners: Listener<T>[] = [];
  const broadcast = (listeners: Listener<T>[]): Broadcast<T> => (value: T) =>
    listeners.forEach((listen) => listen(value));

  const subscribe = (listener: Listener<T>) => initialListeners.push(listener);

  const initialPromise: ProgressPromise<T, R> = cast(
    new Promise((resolve, reject) =>
      init(resolve, reject, broadcast(initialListeners))
    )
  );

  const wrap = <R>(
    promise: ProgressPromise<T, R>,
    ownSubscribe: (l: Listener<T>) => void,
    _then: Function,
    _catch: Function
  ): ProgressPromise<T, R> => {
    const progress: Subscribe<T, R> = (listener: Listener<T>) => {
      ownSubscribe(listener);
      return promise;
    };

    const createClosure = () => {
      const childListeners: Listener<T>[] = [];
      const childBroadcast: Broadcast<T> = broadcast(childListeners);
      const childSubscribe = (listener: Listener<T>) => {
        childListeners.push(listener);
        ownSubscribe(listener);
      };
      return { childBroadcast, childSubscribe };
    };

    promise.progress = progress;
    promise.then = (onResolved, onRejected) => {
      const { childBroadcast, childSubscribe } = createClosure();
      const wrappedResolver = (res: R) => onResolved(res, childBroadcast);
      const wrappedReject = isFunction(onRejected)
        ? (error: Error) => onRejected(error, childBroadcast)
        : undefined;
      const chained = _then.call(promise, wrappedResolver, wrappedReject);
      return wrap(chained, childSubscribe, chained.then, chained.catch);
    };

    promise.catch = (onRejected) => {
      const { childBroadcast, childSubscribe } = createClosure();
      const wrappedReject = (error: Error) => onRejected(error, childBroadcast);
      const chained = _catch.call(promise, wrappedReject);
      return wrap(chained, childSubscribe, chained.then, chained.catch);
    };
    return promise;
  };

  return wrap(
    initialPromise,
    subscribe,
    initialPromise.then,
    initialPromise.catch
  );
};

export default create;
