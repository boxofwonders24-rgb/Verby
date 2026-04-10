// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VerbyStorage",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "VerbyStorage", targets: ["VerbyStorage"])
    ],
    dependencies: [
        .package(path: "../VerbyCore")
    ],
    targets: [
        .target(
            name: "VerbyStorage",
            dependencies: ["VerbyCore"]
        ),
        .testTarget(
            name: "VerbyStorageTests",
            dependencies: ["VerbyStorage"]
        )
    ]
)
