// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "OtterKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "OtterKit", targets: ["OtterKit"]),
        .executable(name: "OtterIntegration", targets: ["OtterIntegration"]),
    ],
    targets: [
        .target(name: "OtterKit"),
        .executableTarget(
            name: "OtterIntegration", dependencies: ["OtterKit"], path: "Integration"),
        .testTarget(name: "OtterKitTests", dependencies: ["OtterKit"]),
    ]
)
