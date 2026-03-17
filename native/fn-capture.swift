// fn-capture.swift
// Native macOS helper that captures Fn/Globe key press & release
// and outputs events to stdout for VerbyPrompt to read.
//
// Requires Accessibility permissions:
// System Settings → Privacy & Security → Accessibility
//
// Usage: ./fn-capture
// Output: "fn_down\n" when Fn pressed, "fn_up\n" when released

import Cocoa
import Foundation

class FnKeyMonitor {
    var fnDown = false

    func start() {
        // Monitor flagsChanged events globally (captures modifier key changes including Fn)
        NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            self?.handleFlags(event)
        }

        // Also monitor locally in case
        NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            self?.handleFlags(event)
            return event
        }

        // Keep alive
        print("fn_ready", terminator: "\n")
        fflush(stdout)
    }

    func handleFlags(_ event: NSEvent) {
        let fnPressed = event.modifierFlags.contains(.function)

        if fnPressed && !fnDown {
            fnDown = true
            print("fn_down", terminator: "\n")
            fflush(stdout)
        } else if !fnPressed && fnDown {
            fnDown = false
            print("fn_up", terminator: "\n")
            fflush(stdout)
        }
    }
}

// Disable buffering
setbuf(stdout, nil)

let monitor = FnKeyMonitor()
monitor.start()

// Run the event loop
RunLoop.current.run()
