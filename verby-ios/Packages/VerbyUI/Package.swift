// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VerbyUI",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "VerbyUI", targets: ["VerbyUI"])
    ],
    targets: [
        .target(name: "VerbyUI"),
        .testTarget(name: "VerbyUITests", dependencies: ["VerbyUI"])
    ]
)
