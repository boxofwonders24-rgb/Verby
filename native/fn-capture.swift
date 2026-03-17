// fn-capture.swift
// Captures Fn (Globe) key press/release on macOS using CGEventTap
// Outputs events to stdout or to a named pipe (--pipe /path)
//
// Requires: Input Monitoring permissions
// System Settings → Privacy & Security → Input Monitoring

import Foundation
import CoreGraphics

setbuf(stdout, nil)

// Parse --pipe argument for named pipe output
var pipeHandle: FileHandle?
if let pipeIdx = CommandLine.arguments.firstIndex(of: "--pipe"),
   pipeIdx + 1 < CommandLine.arguments.count {
    let pipePath = CommandLine.arguments[pipeIdx + 1]
    pipeHandle = FileHandle(forWritingAtPath: pipePath)
}

func emit(_ msg: String) {
    let line = msg + "\n"
    if let handle = pipeHandle {
        handle.write(line.data(using: .utf8)!)
    } else {
        print(msg)
        fflush(stdout)
    }
}

let fnModifierFlag: UInt64 = 0x800000
var fnIsDown = false
var tapRef: CFMachPort?

func eventCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    refcon: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
        if let tap = tapRef {
            CGEvent.tapEnable(tap: tap, enable: true)
        }
        return Unmanaged.passRetained(event)
    }

    if type == .flagsChanged {
        let flags = event.flags.rawValue
        let fnNow = (flags & fnModifierFlag) != 0

        if fnNow && !fnIsDown {
            fnIsDown = true
            emit("fn_down")
        } else if !fnNow && fnIsDown {
            fnIsDown = false
            emit("fn_up")
        }
    }

    return Unmanaged.passRetained(event)
}

// Request Input Monitoring permission — shows macOS system dialog if needed
if #available(macOS 10.15, *) {
    if !CGPreflightListenEventAccess() {
        emit("fn_requesting_permission")
        let granted = CGRequestListenEventAccess()
        if !granted {
            fputs("ERROR: Input Monitoring permission not granted.\n", stderr)
            fputs("Go to System Settings → Privacy & Security → Input Monitoring\n", stderr)
            fputs("and enable FnCapture.\n", stderr)
            // Don't exit — keep trying, user might grant it
            sleep(3)
        }
    }
}

let eventMask = CGEventMask(1 << CGEventType.flagsChanged.rawValue)

guard let eventTap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: eventMask,
    callback: eventCallback,
    userInfo: nil
) else {
    fputs("ERROR: Could not create event tap.\n", stderr)
    exit(1)
}

tapRef = eventTap

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .defaultMode)
CGEvent.tapEnable(tap: eventTap, enable: true)

emit("fn_ready")
CFRunLoopRun()
