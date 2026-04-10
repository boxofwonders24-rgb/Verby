// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VerbyCore",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "VerbyCore", targets: ["VerbyCore"])
    ],
    targets: [
        .target(name: "VerbyCore"),
        .testTarget(name: "VerbyCoreTests", dependencies: ["VerbyCore"])
    ]
)
