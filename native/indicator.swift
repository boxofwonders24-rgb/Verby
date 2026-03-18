// indicator.swift
// Tiny native macOS overlay — a pulsing colored dot with true transparency
// No Electron BrowserWindow = no white box artifacts
//
// Usage: ./indicator show [color-hex]  — shows the dot
//        ./indicator hide              — hides the dot
//        ./indicator color [hex]       — changes color
// Reads commands from stdin line by line when run without args

import Cocoa

class DotWindow: NSWindow {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

class DotView: NSView {
    var dotColor: NSColor = NSColor(red: 99/255, green: 102/255, blue: 241/255, alpha: 1)
    var phase: CGFloat = 0
    var timer: Timer?

    func startAnimating() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0/30, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.phase += 0.04
            self.needsDisplay = true
        }
    }

    func stopAnimating() {
        timer?.invalidate()
        timer = nil
    }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.set()
        dirtyRect.fill()

        let bounce = CGFloat(sin(Double(phase))) * 0.08 + 1.0
        let alphaOsc = CGFloat(sin(Double(phase))) * 0.15 + 0.85

        let dotSize: CGFloat = 20 * bounce
        let cx = bounds.midX - dotSize / 2
        let cy = bounds.midY - dotSize / 2
        let dotRect = NSRect(x: cx, y: cy, width: dotSize, height: dotSize)

        // Outer glow
        let glowSize = dotSize + 20
        let glowRect = NSRect(
            x: bounds.midX - glowSize / 2,
            y: bounds.midY - glowSize / 2,
            width: glowSize, height: glowSize
        )
        let glowColor = dotColor.withAlphaComponent(0.2 * alphaOsc)
        let glowPath = NSBezierPath(ovalIn: glowRect)
        glowColor.setFill()
        glowPath.fill()

        // Main dot
        let path = NSBezierPath(ovalIn: dotRect)
        dotColor.withAlphaComponent(alphaOsc).setFill()
        path.fill()

        // Inner highlight
        let hlSize = dotSize * 0.5
        let hlRect = NSRect(
            x: bounds.midX - hlSize / 2 - 2,
            y: bounds.midY - hlSize / 2 + 2,
            width: hlSize, height: hlSize
        )
        let hlPath = NSBezierPath(ovalIn: hlRect)
        NSColor.white.withAlphaComponent(0.15 * alphaOsc).setFill()
        hlPath.fill()
    }
}

setbuf(stdout, nil)

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

// Create window
let screen = NSScreen.main!
let winSize: CGFloat = 60
let x = (screen.frame.width - winSize) / 2
let y = screen.frame.height - 80 // near top center, below menu bar

let window = DotWindow(
    contentRect: NSRect(x: x, y: y, width: winSize, height: winSize),
    styleMask: .borderless,
    backing: .buffered,
    defer: false
)
window.isOpaque = false
window.backgroundColor = .clear
window.hasShadow = false
window.level = .floating
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
window.ignoresMouseEvents = true

let dotView = DotView(frame: NSRect(x: 0, y: 0, width: winSize, height: winSize))
window.contentView = dotView

// Read commands from stdin
let stdinSource = DispatchSource.makeReadSource(fileDescriptor: FileHandle.standardInput.fileDescriptor, queue: .main)
var buffer = ""

stdinSource.setEventHandler {
    let data = FileHandle.standardInput.availableData
    guard !data.isEmpty else {
        // stdin closed — exit
        NSApp.terminate(nil)
        return
    }
    buffer += String(data: data, encoding: .utf8) ?? ""
    while let newline = buffer.firstIndex(of: "\n") {
        let line = String(buffer[buffer.startIndex..<newline]).trimmingCharacters(in: .whitespaces)
        buffer = String(buffer[buffer.index(after: newline)...])

        if line == "show" || line.hasPrefix("show ") {
            let parts = line.split(separator: " ")
            if parts.count > 1, let color = parseHex(String(parts[1])) {
                dotView.dotColor = color
            }
            dotView.startAnimating()
            window.orderFront(nil)
            print("ok")
        } else if line == "hide" {
            dotView.stopAnimating()
            window.orderOut(nil)
            print("ok")
        } else if line.hasPrefix("color ") {
            let hex = String(line.dropFirst(6))
            if let color = parseHex(hex) {
                dotView.dotColor = color
                dotView.needsDisplay = true
            }
            print("ok")
        }
    }
}
stdinSource.resume()

print("indicator_ready")
app.run()

func parseHex(_ hex: String) -> NSColor? {
    var h = hex
    if h.hasPrefix("#") { h = String(h.dropFirst()) }
    guard h.count == 6, let val = UInt64(h, radix: 16) else { return nil }
    return NSColor(
        red: CGFloat((val >> 16) & 0xFF) / 255,
        green: CGFloat((val >> 8) & 0xFF) / 255,
        blue: CGFloat(val & 0xFF) / 255,
        alpha: 1
    )
}
