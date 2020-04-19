import BroadcastPromise from "../src";
import { toUpper, capitalize } from "lodash";

jest.useFakeTimers();

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("emit", () => {
  it("creates emission promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const emit = jest.fn();

    const wrapped = new BroadcastPromise(async (resolve, reject, { emit }) => {
      await delay1000;
      emit("emit", 1000);
      await delay2000;
      emit("emit", 2000);
      await delay3000;
      emit("emit", 3000);
      resolve("result");
    }).on("emit", emit);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(emit.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(emit.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(emit.mock.calls).toEqual([[1000], [2000], [3000]]);
  });

  it("propagates emissions to downstream promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const emit = jest.fn();

    const wrapped = new BroadcastPromise(async (resolve, reject, { emit }) => {
      await delay1000;
      emit("emit", 1000);
      await delay2000;
      emit("emit", 2000);
      await delay3000;
      emit("emit", 3000);
      resolve("result");
    });

    const chained = wrapped.then(toUpper);
    chained.on("emit", emit);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(emit.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(emit.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    expect(emit.mock.calls).toEqual([[1000], [2000], [3000]]);
  });

  it("does not propagate emissions to upstream promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const emit1 = jest.fn();
    const emit2 = jest.fn();

    const wrapped = new BroadcastPromise(async (resolve, reject, { emit }) => {
      await delay1000;
      emit("emit", 1000);
      await delay2000;
      emit("emit", 2000);
      await delay3000;
      emit("emit", 3000);
      resolve("result");
    }).on("emit", emit1);

    const delay4000 = delay(4000);
    const chained = wrapped
      .then(async (res, { emit }) => {
        await delay4000;
        emit("emit", 4000);
        return toUpper(res);
      })
      .on("emit", emit2);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(emit1.mock.calls).toEqual([[1000]]);
    expect(emit2.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(emit1.mock.calls).toEqual([[1000], [2000]]);
    expect(emit2.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    await delay3000;
    expect(emit1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(emit2.mock.calls).toEqual([[1000], [2000], [3000]]);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    expect(emit1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(emit2.mock.calls).toEqual([[1000], [2000], [3000], [4000]]);
  });

  it("correctly propagates emissions to separate downstream listeners", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const emit1 = jest.fn();
    const emit2 = jest.fn();
    const emit3 = jest.fn();

    const wrapped = new BroadcastPromise(async (resolve, reject, { emit }) => {
      await delay1000;
      emit("emit", 1000);
      await delay2000;
      emit("emit", 2000);
      await delay3000;
      emit("emit", 3000);
      resolve("result");
    }).on("emit", emit1);

    const delay4000 = delay(4000);
    const chained1 = wrapped
      .then(async (res, { emit }) => {
        await delay4000;
        emit("emit", "chained1");
        return toUpper(res);
      })
      .on("emit", emit2);

    const chained2 = wrapped
      .then(async (res, { emit }) => {
        await delay4000;
        emit("emit", "chained2");
        return capitalize(res);
      })
      .on("emit", emit3);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(emit1.mock.calls).toEqual([[1000]]);
    expect(emit2.mock.calls).toEqual([[1000]]);
    expect(emit3.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(emit1.mock.calls).toEqual([[1000], [2000]]);
    expect(emit2.mock.calls).toEqual([[1000], [2000]]);
    expect(emit3.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    await delay3000;
    expect(emit1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(emit2.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(emit3.mock.calls).toEqual([[1000], [2000], [3000]]);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(await chained1).toEqual("RESULT");
    expect(await chained2).toEqual("Result");
    expect(emit1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(emit2.mock.calls).toEqual([[1000], [2000], [3000], ["chained1"]]);
    expect(emit3.mock.calls).toEqual([[1000], [2000], [3000], ["chained2"]]);
  });
});
