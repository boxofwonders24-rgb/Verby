import XCTest
import VerbyCore
@testable import VerbyStorage

final class CoreDataSettingsStoreTests: XCTestCase {

    private var controller: PersistenceController!
    private var store: CoreDataSettingsStore!

    override func setUp() {
        super.setUp()
        controller = PersistenceController(inMemory: true)
        store = CoreDataSettingsStore(context: controller.viewContext)
    }

    func testLoadReturnsDefaultsWhenEmpty() async throws {
        let settings = try await store.load()
        XCTAssertEqual(settings.defaultMode, .general)
        XCTAssertEqual(settings.language, "en-US")
    }

    func testSaveAndLoad() async throws {
        let settings = AppSettings(
            defaultMode: .email,
            language: "en-GB",
            preferences: ["haptics": "disabled"]
        )
        try await store.save(settings)
        let loaded = try await store.load()
        XCTAssertEqual(loaded.defaultMode, .email)
        XCTAssertEqual(loaded.language, "en-GB")
        XCTAssertEqual(loaded.preferences["haptics"], "disabled")
    }

    func testSaveOverwritesPreviousSettings() async throws {
        let first = AppSettings(defaultMode: .email, language: "en-US")
        let second = AppSettings(defaultMode: .prompt, language: "es-ES")
        try await store.save(first)
        try await store.save(second)
        let loaded = try await store.load()
        XCTAssertEqual(loaded.defaultMode, .prompt)
        XCTAssertEqual(loaded.language, "es-ES")
    }
}
