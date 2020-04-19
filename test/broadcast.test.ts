import Hooked from "../src";
import { toUpper, capitalize } from "lodash";

jest.useFakeTimers();

const delay = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("broadcast", () => {
  it("creates broadcast promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const broadcast = jest.fn();

    const wrapped = new Hooked(async (resolve, reject, { broadcast }) => {
      await delay1000;
      broadcast("broadcast", 1000);
      await delay2000;
      broadcast("broadcast", 2000);
      await delay3000;
      broadcast("broadcast", 3000);
      resolve("result");
    }).on("broadcast", broadcast);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(broadcast.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(broadcast.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(broadcast.mock.calls).toEqual([[1000], [2000], [3000]]);
  });

  it("propagates broadcast to downstream promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const broadcast = jest.fn();

    const wrapped = new Hooked(async (resolve, reject, { broadcast }) => {
      await delay1000;
      broadcast("broadcast", 1000);
      await delay2000;
      broadcast("broadcast", 2000);
      await delay3000;
      broadcast("broadcast", 3000);
      resolve("result");
    });

    const chained = wrapped.then(toUpper);
    chained.on("broadcast", broadcast);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(broadcast.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(broadcast.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    expect(broadcast.mock.calls).toEqual([[1000], [2000], [3000]]);
  });

  it("propagates broadcast to upstream promise", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const broadcast1 = jest.fn();
    const broadcast2 = jest.fn();

    const wrapped = new Hooked<string, number>(
      async (resolve, reject, { broadcast }) => {
        await delay1000;
        broadcast("broadcast", 1000);
        await delay2000;
        broadcast("broadcast", 2000);
        await delay3000;
        broadcast("broadcast", 3000);
        resolve("result");
      }
    ).on("broadcast", broadcast1);

    const delay4000 = delay(4000);
    const chained: Hooked<string, number> = wrapped
      .then(async (res, { broadcast }) => {
        await delay4000;
        broadcast("broadcast", 4000);
        return toUpper(res);
      })
      .on("broadcast", broadcast2);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(broadcast1.mock.calls).toEqual([[1000]]);
    expect(broadcast2.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(broadcast1.mock.calls).toEqual([[1000], [2000]]);
    expect(broadcast2.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    await delay3000;
    expect(broadcast1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(broadcast2.mock.calls).toEqual([[1000], [2000], [3000]]);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    expect(broadcast1.mock.calls).toEqual([[1000], [2000], [3000], [4000]]);
    expect(broadcast2.mock.calls).toEqual([[1000], [2000], [3000], [4000]]);
  });

  it("correctly propagates broadcasts to separate downstream listeners", async () => {
    const delay1000 = delay(1000);
    const delay2000 = delay(2000);
    const delay3000 = delay(3000);

    const broadcast1 = jest.fn();
    const broadcast2 = jest.fn();
    const broadcast3 = jest.fn();

    const wrapped = new Hooked<string, number | string>(
      async (resolve, reject, { broadcast }) => {
        await delay1000;
        broadcast("broadcast", 1000);
        await delay2000;
        broadcast("broadcast", 2000);
        await delay3000;
        broadcast("broadcast", 3000);
        resolve("result");
      }
    ).on("broadcast", broadcast1);

    const delay4000 = delay(4000);
    const chained1: Hooked<string, number | string> = wrapped
      .then(async (res, { broadcast }) => {
        await delay4000;
        broadcast("broadcast", "chained1");
        return toUpper(res);
      })
      .on("broadcast", broadcast2);

    const chained2: Hooked<string, number | string> = wrapped
      .then(async (res, { broadcast }) => {
        await delay4000;
        broadcast("broadcast", "chained2");
        return capitalize(res);
      })
      .on("broadcast", broadcast3);

    jest.advanceTimersByTime(1000);
    await delay1000;
    expect(broadcast1.mock.calls).toEqual([[1000]]);
    expect(broadcast2.mock.calls).toEqual([[1000]]);
    expect(broadcast3.mock.calls).toEqual([[1000]]);

    jest.advanceTimersByTime(1000);
    await delay2000;
    expect(broadcast1.mock.calls).toEqual([[1000], [2000]]);
    expect(broadcast2.mock.calls).toEqual([[1000], [2000]]);
    expect(broadcast3.mock.calls).toEqual([[1000], [2000]]);

    jest.advanceTimersByTime(1000);
    await delay3000;
    expect(broadcast1.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(broadcast2.mock.calls).toEqual([[1000], [2000], [3000]]);
    expect(broadcast3.mock.calls).toEqual([[1000], [2000], [3000]]);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(await chained1).toEqual("RESULT");
    expect(await chained2).toEqual("Result");
    expect(broadcast1.mock.calls).toEqual([
      [1000],
      [2000],
      [3000],
      ["chained1"],
      ["chained2"],
    ]);
    expect(broadcast2.mock.calls).toEqual([
      [1000],
      [2000],
      [3000],
      ["chained1"],
    ]);
    expect(broadcast3.mock.calls).toEqual([
      [1000],
      [2000],
      [3000],
      ["chained2"],
    ]);
  });

  it("can broadcast from outside", async () => {
    const broadcast = jest.fn();
    const wrapped = new Hooked("result");
    wrapped.on("broadcast", broadcast);

    expect(await wrapped).toEqual("result");
    wrapped.broadcast("broadcast", "outside broadcast");
    expect(broadcast.mock.calls).toEqual([["outside broadcast"]]);
  });

  it("can receive broadcast from outside", async () => {
    const broadcast = jest.fn();
    const wrapped = new Hooked((resolve, reject, { on }) => {
      on("broadcast", broadcast);
      resolve("result");
    });

    expect(await wrapped).toEqual("result");
    wrapped.broadcast("broadcast", "outside broadcast");
    expect(broadcast.mock.calls).toEqual([["outside broadcast"]]);
  });

  it("can receive broadcast from upstream promise", async () => {
    const broadcast = jest.fn();
    const wrapped = new Hooked("result");
    const chained = wrapped.then((result, { on }) => {
      on("broadcast", broadcast);
      return toUpper(result);
    });

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    wrapped.emit("broadcast", "broadcast emit");
    expect(broadcast.mock.calls).toEqual([["broadcast emit"]]);
  });

  it("can receive broadcast from downstream promise", async () => {
    const broadcast = jest.fn();
    const wrapped = new Hooked((resolve, reject, { on }) => {
      on("broadcast", broadcast);
      resolve("result");
    });
    const chained = wrapped.then(toUpper);

    expect(await wrapped).toEqual("result");
    expect(await chained).toEqual("RESULT");
    chained.broadcast("broadcast", "outside broadcast");
    expect(broadcast.mock.calls).toEqual([["outside broadcast"]]);
  });

  it("can broadcast without value", async () => {
    const broadcast = jest.fn();
    const delay1000 = delay(1000);
    const wrapped = new Hooked<string, string>(
      async (resolve, reject, { broadcast }) => {
        await delay1000;
        broadcast("broadcast");
        resolve("result");
      }
    ).on("broadcast", broadcast);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it("does not broadcast anything when all options are set to false", async () => {
    const broadcast = jest.fn();
    const delay1000 = delay(1000);
    const wrapped = new Hooked<string, string>(
      async (resolve, reject, { broadcast }) => {
        await delay1000;
        broadcast("broadcast", "message", {
          self: false,
          downstream: false,
          upstream: false,
        });
        resolve("result");
      }
    ).on("broadcast", broadcast);

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    expect(broadcast).not.toHaveBeenCalled();
  });

  it("does not broadcast anything from outside when all options are set to false", async () => {
    const broadcast = jest.fn();
    const delay1000 = delay(1000);
    const wrapped = new Hooked<string, string>(
      async (resolve, reject, { on }) => {
        await delay1000;
        on("broadcast", broadcast);
        resolve("result");
      }
    );

    jest.advanceTimersByTime(1000);

    expect(await wrapped).toEqual("result");
    wrapped.broadcast("broadcast", "message", {
      self: false,
      downstream: false,
      upstream: false,
    });
    expect(broadcast).not.toHaveBeenCalled();
  });
});
