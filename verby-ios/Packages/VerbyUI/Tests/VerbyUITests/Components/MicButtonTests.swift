import XCTest
import SwiftUI
@testable import VerbyUI

final class MicButtonTests: XCTestCase {

    func testMicButtonStates() {
        XCTAssertEqual(MicButtonState.idle.isRecording, false)
        XCTAssertEqual(MicButtonState.recording.isRecording, true)
        XCTAssertEqual(MicButtonState.processing.isRecording, false)
    }

    func testMicButtonSizeDefault() {
        let config = MicButtonConfig()
        XCTAssertEqual(config.size, 64)
    }

    func testMicButtonSizeCustom() {
        let config = MicButtonConfig(size: 72)
        XCTAssertEqual(config.size, 72)
    }
}
