import Hooked from "../src";
import { toUpper } from "lodash";

jest.useFakeTimers();

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("event", () => {
  it("creates event producing promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const event = jest.fn();

    const wrapped = new Hooked(async (resolve, reject, { event }) => {
      await delay1000;
      event("event", 1000);
      await delay2000;
      event("event", 2000);
      await delay3000;
      event("event", 3000);
      resolve("result");
    }).on("event", event);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(event.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(event.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(event.mock.calls).toEqual([[1000], [2000], [3000]]);
  });

  it("does not send event to self if option is false", async () => {
    const delay1000 = delay(1000);

    const event = jest.fn();

    const wrapped = new Hooked(async (resolve, reject, { event }) => {
      await delay1000;
      event("event", 1000, { self: false });
      resolve("result");
    }).on("event", event);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(await wrapped).toEqual("result");
    expect(event).not.toHaveBeenCalled();
  });

  it("rejects promise if event handler throws an error", async () => {
    const delay1000 = delay(1000);
    const wrapped = new Hooked(async (resolve, reject, { event }) => {
      await delay1000;
      event("event", 1000);
      resolve("result");
    }).on("event", () => {
      throw Error("ERROR");
    });

    jest.advanceTimersByTime(1000);

    expect(wrapped).rejects.toEqual(new Error("ERROR"));
  });

  it("throws an error if event handler is not a function", () => {
    const wrapped = new Hooked();
    expect(() => wrapped.on("event", undefined)).toThrow();
  });

  it("does not propagate event to downstream promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const event = jest.fn();

    const wrapped = new Hooked(async (resolve, reject, { event }) => {
      await delay1000;
      event("event", 1000);
      await delay2000;
      event("event", 2000);
      await delay3000;
      event("event", 3000);
      resolve("result");
    });

    const chained = wrapped.then(toUpper);
    chained.on("event", event);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(event).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(event).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    expect(event).not.toHaveBeenCalled();
  });

  it("does not propagate event to upstream promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const event = jest.fn();

    const wrapped = new Hooked("result").on("event", event);

    const chained = wrapped.then(async (result, { event }) => {
      await delay1000;
      event("event", 1000);
      await delay2000;
      event("event", 2000);
      await delay3000;
      event("event", 3000);
      return toUpper(result);
    });

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(event).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(event).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    expect(event).not.toHaveBeenCalled();
  });

  it("correctly passes events to corresponding listeners", async () => {
    const delay1000 = delay(1000);

    const event1 = jest.fn();
    const event2 = jest.fn();
    const event3 = jest.fn();

    const wrapped = new Hooked(async (resolve, reject, { event }) => {
      await delay1000;
      event("event1", 1000);
      event("event2", 2000);
      event("event3", 3000);
      resolve("result");
    })
      .on("event1", event1)
      .on("event2", event2)
      .on("event3", event3);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(event1.mock.calls).toEqual([[1000]]);
    expect(event2.mock.calls).toEqual([[2000]]);
    expect(event3.mock.calls).toEqual([[3000]]);
  });

  it("can create event from catch", async () => {
    const promise = delay(3000).then(() => {
      throw new Error("ERROR");
    });

    const error1 = jest.fn();
    const error2 = jest.fn();
    const wrapped = new Hooked(promise).on("error", error1);
    const chained = wrapped
      .catch((reason, { event }) => {
        event("error", reason);
        return reason;
      })
      .on("error", error2);

    jest.advanceTimersByTime(3000);

    expect(await chained).toEqual(new Error("ERROR"));
    expect(error1).not.toHaveBeenCalled();
    expect(error2.mock.calls).toEqual([[new Error("ERROR")]]);
  });

  it("can create event from outside", async () => {
    const event = jest.fn();
    const wrapped = new Hooked("result");
    wrapped.on("event", event);

    wrapped.event("event", "outside event");

    expect(await wrapped).toEqual("result");
    expect(event.mock.calls).toEqual([["outside event"]]);
  });

  it("does not receive event from outside if self option is false", async () => {
    const event = jest.fn();
    const wrapped = new Hooked("result");
    wrapped.on("event", event);

    wrapped.event("event", "outside event", { self: false });

    expect(await wrapped).toEqual("result");
    expect(event).not.toHaveBeenCalled();
  });

  it("can receive event from the outside", async () => {
    const event = jest.fn();
    const wrapped = new Hooked((resolve, reject, { on }) => {
      on("event", event);
      resolve("result");
    });

    wrapped.event("event", "outside event");

    expect(await wrapped).toEqual("result");
    expect(event.mock.calls).toEqual([["outside event"]]);
  });

  it("can create event without value", async () => {
    const event = jest.fn();
    const delay1000 = delay(1000);
    const wrapped = new Hooked<string, string, any>(
      async (resolve, reject, { event }) => {
        await delay1000;
        event("event");
        resolve("result");
      }
    ).on("event", event);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(event).toHaveBeenCalledTimes(1);
  });
});
