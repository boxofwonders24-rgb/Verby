// text-inject.swift
// Injects text at the current cursor position in any app via clipboard + CGEventPost Cmd+V
//
// Usage: echo "hello world" | ./text-inject
//    or: ./text-inject "hello world"
//
// Requires: Accessibility permissions for the parent app
// System Settings → Privacy & Security → Accessibility

import Foundation
import AppKit
import CoreGraphics

setbuf(stdout, nil)

// Read text from args or stdin
var text: String
if CommandLine.arguments.count > 1 {
    text = CommandLine.arguments.dropFirst().joined(separator: " ")
} else {
    var input = ""
    while let line = readLine(strippingNewline: false) {
        input += line
    }
    text = input
}

// Trim trailing newline from stdin
if text.hasSuffix("\n") {
    text = String(text.dropLast())
}

guard !text.isEmpty else {
    fputs("ERROR: No text provided\n", stderr)
    exit(1)
}

let pasteboard = NSPasteboard.general

// Save current clipboard
let oldContents = pasteboard.string(forType: .string)

// Set new text on clipboard
pasteboard.clearContents()
pasteboard.setString(text, forType: .string)

// Wait for clipboard to fully register — URL bars and terminals need this
usleep(100_000) // 100ms

// Simulate Cmd+V via CGEventPost
let source = CGEventSource(stateID: .hidSystemState)

guard let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 0x09, keyDown: true),
      let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 0x09, keyDown: false) else {
    fputs("ERROR: Could not create CGEvent. Check Accessibility permissions.\n", stderr)
    exit(1)
}

keyDown.flags = .maskCommand
keyUp.flags = .maskCommand

keyDown.post(tap: .cgSessionEventTap)
usleep(50_000) // 50ms between down/up — some apps need this gap
keyUp.post(tap: .cgSessionEventTap)

// Wait for target app to process the paste before restoring clipboard
// URL bars, terminals, and web apps can be slow to process paste events
usleep(500_000) // 500ms

pasteboard.clearContents()
if let old = oldContents {
    pasteboard.setString(old, forType: .string)
}

print("ok")
