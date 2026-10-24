export type SimulatorDevices = Record<
  string,
  {
    name: string;
    isAvailable: boolean;
    deviceTypeIdentifier?: string;
  }[]
>;

/** Use a runtime that matches the selected Xcode SDK, not another installed Xcode. */
export function selectSimulator(
  devices: SimulatorDevices,
  family: "iPhone" | "iPad",
  sdkVersion: string,
) {
  const version = /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(sdkVersion);
  if (!version) throw new Error("Invalid iOS Simulator SDK version.");
  const prefix = `com.apple.CoreSimulator.SimRuntime.iOS-${version[1]}-${version[2]}`;
  const candidate = Object.entries(devices)
    .filter(
      ([runtime]) => runtime === prefix || runtime.startsWith(`${prefix}-`),
    )
    .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
    .flatMap(([runtime, values]) =>
      values.flatMap((device) =>
        device.isAvailable &&
        device.name.startsWith(family) &&
        device.deviceTypeIdentifier
          ? [
              {
                name: device.name,
                deviceTypeIdentifier: device.deviceTypeIdentifier,
                runtime,
              },
            ]
          : [],
      ),
    )[0];
  if (!candidate)
    throw new Error(
      `No available ${family} Simulator for iOS SDK ${sdkVersion}. Install a matching runtime.`,
    );
  return candidate;
}
