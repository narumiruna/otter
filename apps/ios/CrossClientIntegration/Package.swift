// swift-tools-version: 6.0
import PackageDescription

// This package does not change the app or the existing integration executable.
let package = Package(
    name: "OtterCrossClientIntegration",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "OtterCrossClient", targets: ["OtterCrossClient"])],
    dependencies: [.package(name: "OtterKit", path: "..")],
    targets: [
        .executableTarget(
            name: "OtterCrossClient",
            dependencies: [.product(name: "OtterKit", package: "OtterKit")],
            path: ".", exclude: ["Package.swift"], sources: ["Bridge.swift"])
    ]
)
