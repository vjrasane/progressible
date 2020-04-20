import Hooked from "../src";
import { toUpper } from "lodash";

jest.useFakeTimers();

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("set/get", () => {
  it("sets single value", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);

    wrapped.set("key", "value");

    expect(wrapped.get("key")).toEqual("value");
    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(wrapped.get("key")).toEqual("value");
  });

  it("does not set self value if option set to false", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);

    wrapped.set("key", "value", { self: false });

    expect(wrapped.get("key")).toBe(undefined);
    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(wrapped.get("key")).toBe(undefined);
  });

  it("gets default value if not set", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);

    expect(wrapped.get("key", "value")).toEqual("value");
    expect(wrapped.get("key")).toBe(undefined);

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(wrapped.get("key", "value")).toEqual("value");
    expect(wrapped.get("key")).toBe(undefined);
  });

  it("sets multiple values", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);

    wrapped.set("key1", "value1");
    wrapped.set("key2", "value2");
    wrapped.set("key3", "value3");

    expect(wrapped.get("key1")).toEqual("value1");
    expect(wrapped.get("key2")).toEqual("value2");
    expect(wrapped.get("key3")).toEqual("value3");
    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(wrapped.get("key1")).toEqual("value1");
    expect(wrapped.get("key2")).toEqual("value2");
    expect(wrapped.get("key3")).toEqual("value3");
  });

  it("does not set value in upstream promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.then(toUpper);

    chained.set("key", "value");

    expect(chained.get("key")).toEqual("value");
    expect(wrapped.get("key")).toBe(undefined);

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");

    expect(chained.get("key")).toEqual("value");
    expect(wrapped.get("key")).toBe(undefined);
  });

  it("sets value in upstream promise if option set to true", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.then(toUpper);

    chained.set("key", "value", { upstream: true });

    expect(chained.get("key")).toEqual("value");
    expect(wrapped.get("key")).toEqual("value");

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");

    expect(chained.get("key")).toEqual("value");
    expect(wrapped.get("key")).toEqual("value");
  });

  it("does not set value in downstream promise", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.then(toUpper);

    wrapped.set("key", "value");

    expect(wrapped.get("key")).toEqual("value");
    expect(chained.get("key")).toBe(undefined);

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");

    expect(wrapped.get("key")).toEqual("value");
    expect(chained.get("key")).toBe(undefined);
  });

  it("sets value in downstream promise if option set to true", async () => {
    const promise = delay(3000).then(() => "result");
    const wrapped = new Hooked(promise);
    const chained = wrapped.then(toUpper);

    wrapped.set("key", "value", { downstream: true });

    expect(wrapped.get("key")).toEqual("value");
    expect(chained.get("key")).toEqual("value");

    jest.advanceTimersByTime(3000);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");

    expect(wrapped.get("key")).toEqual("value");
    expect(chained.get("key")).toEqual("value");
  });
});
