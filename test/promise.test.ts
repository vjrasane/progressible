import BroadcastPromise from "../src";
import { toUpper } from "lodash";

jest.useFakeTimers();

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("promise", () => {
  it("resolves immediately without any arguments", async () => {
    const wrapped = new BroadcastPromise();

    expect(await wrapped).toEqual(undefined);
  });

  it("creates regular promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new BroadcastPromise(promise);

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
  });

  it("can call then on created promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new BroadcastPromise(promise);
    const chained = wrapped.then(toUpper);

    jest.advanceTimersByTime(3000);

    expect(await chained).toEqual("RESULT");
  });

  it("can call catch on created promise", async () => {
    const promise = delay(3000).then(() => {
      throw new Error("ERROR");
    });
    const wrapped = new BroadcastPromise(promise);
    const chained = wrapped.catch((reason) => reason);

    jest.advanceTimersByTime(3000);

    expect(await chained).toEqual(new Error("ERROR"));
  });
});
