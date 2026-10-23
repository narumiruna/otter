import { describe, expect, test } from "vitest";
import {
  type SimulatorDevices,
  selectSimulator,
} from "./ios-integration-simulator.js";
import { uiSuiteBudgetMs } from "./ios-integration-ui.js";

const ios18 = "com.apple.CoreSimulator.SimRuntime.iOS-18-5";
const ios26 = "com.apple.CoreSimulator.SimRuntime.iOS-26-2";
const phone = {
  name: "iPhone 16",
  isAvailable: true,
  deviceTypeIdentifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-16",
};
const tablet = {
  name: "iPad (A16)",
  isAvailable: true,
  deviceTypeIdentifier: "com.apple.CoreSimulator.SimDeviceType.iPad-A16",
};
const devices: SimulatorDevices = {
  [ios26]: [{ ...phone, name: "iPhone 17" }, tablet],
  [ios18]: [phone, tablet],
};

describe("iOS Simulator selection", () => {
  test.each(["iPhone", "iPad"] as const)(
    "selects an available %s for the active SDK instead of the newest runtime",
    (family) => {
      const selected = selectSimulator(devices, family, "18.5");
      expect(selected.runtime).toBe(ios18);
      expect(selected.name.startsWith(family)).toBe(true);
      expect(selectSimulator(devices, family, "26.2").runtime).toBe(ios26);
    },
  );

  test("uses the latest patch within the SDK version", () => {
    const patched = `${ios18}-1`;
    expect(
      selectSimulator({ ...devices, [patched]: [phone] }, "iPhone", "18.5.0")
        .runtime,
    ).toBe(patched);
  });

  test("rejects unavailable devices and devices without a device type", () => {
    const listing: SimulatorDevices = {
      [ios18]: [
        { ...phone, isAvailable: false },
        { name: "iPhone missing type", isAvailable: true },
        tablet,
      ],
      [ios26]: [phone],
    };
    expect(() => selectSimulator(listing, "iPhone", "18.5")).toThrow(
      "No available iPhone Simulator for iOS SDK 18.5",
    );
    expect(selectSimulator(listing, "iPad", "18.5").name).toBe(tablet.name);
  });

  test("does not use another SDK, platform, or device family as a fallback", () => {
    const listings: SimulatorDevices[] = [
      { [ios26]: [phone] },
      { [ios18]: [tablet] },
      { "com.apple.CoreSimulator.SimRuntime.tvOS-18-5": [phone] },
      {},
    ];
    for (const listing of listings)
      expect(() => selectSimulator(listing, "iPhone", "18.5")).toThrow();
  });

  test.each(["", "18", "v18.5", "18.5 beta"])(
    "rejects an invalid SDK version %j",
    (version) => {
      expect(() => selectSimulator(devices, "iPhone", version)).toThrow(
        "Invalid iOS Simulator SDK version",
      );
    },
  );
});

describe("live UI runner budget", () => {
  test("allows whole-minute XCTest limits and cold startup without assertion retries", () => {
    expect(uiSuiteBudgetMs(4)).toBe((4 * 300 + 360) * 1_000);
    expect(uiSuiteBudgetMs(1)).toBe((300 + 360) * 1_000);
  });
});
