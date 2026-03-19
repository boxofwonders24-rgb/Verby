#!/usr/bin/env swift

import Cocoa

// Load the source icon
let srcPath = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "assets/icon-512.png"

guard let srcImage = NSImage(contentsOfFile: srcPath) else {
    print("Error: Could not load \(srcPath)")
    exit(1)
}

let srcRep = NSBitmapImageRep(data: srcImage.tiffRepresentation!)!
let srcSize = NSSize(width: srcRep.pixelsWide, height: srcRep.pixelsHigh)

func makeRoundedIcon(size: Int) -> NSBitmapImageRep {
    let s = CGFloat(size)
    let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4,
        hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0, bitsPerPixel: 0
    )!

    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = ctx

    let rect = NSRect(x: 0, y: 0, width: s, height: s)

    // macOS squircle corner radius is ~22.37% of icon size
    let cornerRadius = s * 0.2237

    // Clear background (transparent)
    ctx.cgContext.clear(rect)

    // Draw rounded rect clip path (approximate squircle with bezier)
    let path = NSBezierPath(roundedRect: rect.insetBy(dx: 0, dy: 0),
                            xRadius: cornerRadius, yRadius: cornerRadius)
    path.addClip()

    // Draw the source image scaled to fill
    srcImage.draw(in: rect, from: NSRect(origin: .zero, size: srcSize),
                  operation: .sourceOver, fraction: 1.0)

    NSGraphicsContext.current = nil
    return rep
}

// Generate all required sizes for .iconset
let sizes: [(name: String, px: Int)] = [
    ("icon_16x16.png", 16),
    ("icon_16x16@2x.png", 32),
    ("icon_32x32.png", 32),
    ("icon_32x32@2x.png", 64),
    ("icon_128x128.png", 128),
    ("icon_128x128@2x.png", 256),
    ("icon_256x256.png", 256),
    ("icon_256x256@2x.png", 512),
    ("icon_512x512.png", 512),
    ("icon_512x512@2x.png", 1024),
]

let iconsetDir = "assets/icon.iconset"

// Create iconset directory if needed
let fm = FileManager.default
try? fm.createDirectory(atPath: iconsetDir, withIntermediateDirectories: true)

for (name, px) in sizes {
    let rep = makeRoundedIcon(size: px)
    let data = rep.representation(using: .png, properties: [:])!
    let path = "\(iconsetDir)/\(name)"
    try! data.write(to: URL(fileURLWithPath: path))
    print("Generated \(path) (\(px)x\(px))")
}

// Also save a 512px version for dock icon
let dockRep = makeRoundedIcon(size: 512)
let dockData = dockRep.representation(using: .png, properties: [:])!
try! dockData.write(to: URL(fileURLWithPath: "assets/icon-512.png"))
print("Generated assets/icon-512.png (512x512)")

print("\nDone! Now run: iconutil -c icns assets/icon.iconset -o assets/icon.icns")
