import XCTest
@testable import VerbyUI

final class WaveformViewTests: XCTestCase {

    func testWaveformBarCount() {
        let config = WaveformConfig(barCount: 12)
        XCTAssertEqual(config.barCount, 12)
    }

    func testWaveformDefaultConfig() {
        let config = WaveformConfig()
        XCTAssertEqual(config.barCount, 10)
        XCTAssertEqual(config.barWidth, 3.0)
        XCTAssertEqual(config.spacing, 3.0)
    }
}
