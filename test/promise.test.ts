import Hooked from "../src";
import { toUpper } from "lodash";

jest.useFakeTimers();

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("promise", () => {
  it("resolves immediately without any arguments", async () => {
    const wrapped = new Hooked();

    expect(await wrapped).toEqual(undefined);
  });

  it("creates regular promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
  });

  it("can call then on created promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.then(toUpper);

    jest.advanceTimersByTime(3000);

    expect(await chained).toEqual("RESULT");
  });

  it("can call catch on created promise", async () => {
    const promise = delay(3000).then(() => {
      throw new Error("ERROR");
    });
    const wrapped = new Hooked(promise);
    const chained = wrapped.catch((reason) => reason);

    jest.advanceTimersByTime(3000);

    expect(await chained).toEqual(new Error("ERROR"));
  });

  it("can call finally on created promise", async () => {
    const __finally = jest.fn();
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.finally(__finally);

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("result");
    expect(__finally).toHaveBeenCalledTimes(1);
  });

  it("can call then without handlers", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.then();

    jest.advanceTimersByTime(3000);
    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("result");
  });

  it("can call catch without handler", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.catch();

    jest.advanceTimersByTime(3000);
    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("result");
  });

  it("can call finally without handler", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.finally();

    jest.advanceTimersByTime(3000);
    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("result");
  });

  it("rejects if executor throws an error", async () => {
    expect.assertions(1);
    const wrapped = new Hooked(() => {
      throw new Error("ERROR");
    });

    await expect(wrapped).rejects.toEqual(new Error("ERROR"));
  });

  it("rejects if executor resolve receives a promise that rejects", async () => {
    expect.assertions(1);

    const wrapped = new Hooked((resolve) =>
      resolve(Promise.reject(new Error("ERROR")))
    );

    await expect(wrapped).rejects.toEqual(new Error("ERROR"));
  });
});
