import XCTest
import SwiftUI
@testable import VerbyUI

final class VerbyColorsTests: XCTestCase {

    func testPrimaryColorExists() {
        let color = VerbyColors.primary
        XCTAssertNotNil(color)
    }

    func testSecondaryColorExists() {
        let color = VerbyColors.secondary
        XCTAssertNotNil(color)
    }

    func testBackgroundColorExists() {
        let color = VerbyColors.background
        XCTAssertNotNil(color)
    }

    func testRecordingColorExists() {
        let color = VerbyColors.recording
        XCTAssertNotNil(color)
    }

    func testGradientHasCorrectStops() {
        let gradient = VerbyGradients.primary
        XCTAssertNotNil(gradient)
    }

    func testProcessingColorExists() {
        let color = VerbyColors.processing
        XCTAssertNotNil(color)
    }
}
