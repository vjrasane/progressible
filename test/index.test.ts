import create, { ProgressPromise } from "../src";
import { toUpper, capitalize } from "lodash";

jest.useFakeTimers();

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("create", () => {
  it("creates regular promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = create((resolve) => resolve(promise));

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
  });

  it("creates progressing promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const progress = jest.fn();

    const wrapped = create(async (resolve, reject, onProgress) => {
      await delay1000;
      onProgress(1000);
      await delay2000;
      onProgress(2000);
      await delay3000;
      onProgress(3000);
      resolve("result");
    }).progress(progress);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(progress.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(progress.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(progress.mock.calls).toEqual([[1000], [2000], [3000]]);
  });

  it("can call then on created promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = create((resolve) => resolve(promise));
    const chained = wrapped.then(toUpper);

    jest.advanceTimersByTime(3000);

    expect(await chained).toEqual("RESULT");
  });

  it("can call progress on chained promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const progress = jest.fn();

    const wrapped = create(async (resolve, reject, onProgress) => {
      await delay1000;
      onProgress(1000);
      await delay2000;
      onProgress(2000);
      await delay3000;
      onProgress(3000);
      resolve("result");
    });

    const chained = wrapped.then(toUpper);
    chained.progress(progress);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(progress.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(progress.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(progress.mock.calls).toEqual([[1000], [2000], [3000]]);
  });

  it("can call onProgress on chained promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const progress = jest.fn();

    const wrapped = create(async (resolve, reject, onProgress) => {
      await delay1000;
      onProgress(1000);
      await delay2000;
      onProgress(2000);
      await delay3000;
      onProgress(3000);
      resolve("result");
    });

    const delay4000 = delay(4000);
    const chained = wrapped
      .then(async (res, onProgress) => {
        await delay4000;
        onProgress(4000);
        return toUpper(res);
      })
      .progress(progress);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(progress.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(progress.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    await delay3000;
    expect(progress.mock.calls).toEqual([[1000], [2000], [3000]]);

    jest.advanceTimersByTime(1000);

    expect(await chained).toEqual("RESULT");
    expect(progress.mock.calls).toEqual([[1000], [2000], [3000], [4000]]);
  });

  it("correctly broadcasts chained progress to downstream listeners", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const progress1 = jest.fn();
    const progress2 = jest.fn();
    const progress3 = jest.fn();

    const wrapped = create(async (resolve, reject, onProgress) => {
      await delay1000;
      onProgress(1000);
      await delay2000;
      onProgress(2000);
      await delay3000;
      onProgress(3000);
      resolve("result");
    }).progress(progress1);

    const delay4000 = delay(4000);
    const chained1 = wrapped
      .then(async (res, onProgress) => {
        await delay4000;
        onProgress("chained1");
        return toUpper(res);
      })
      .progress(progress2);

    const chained2 = wrapped
      .then(async (res, onProgress) => {
        await delay4000;
        onProgress("chained2");
        return capitalize(res);
      })
      .progress(progress3);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(progress1.mock.calls).toEqual([[1000]]);
    expect(progress2.mock.calls).toEqual([[1000]]);
    expect(progress3.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(progress1.mock.calls).toEqual([[1000], [2000]]);
    expect(progress2.mock.calls).toEqual([[1000], [2000]]);
    expect(progress3.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    await delay3000;
    expect(progress1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(progress2.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(progress3.mock.calls).toEqual([[1000], [2000], [3000]]);

    jest.advanceTimersByTime(1000);

    expect(await chained1).toEqual("RESULT");
    expect(await chained2).toEqual("Result");
    expect(progress1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(progress2.mock.calls).toEqual([
      [1000],
      [2000],
      [3000],
      ["chained1"],
    ]);
    expect(progress3.mock.calls).toEqual([
      [1000],
      [2000],
      [3000],
      ["chained2"],
    ]);
  });
});
