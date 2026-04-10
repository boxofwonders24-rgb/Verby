import XCTest
import VerbyCore
@testable import VerbyStorage

final class CoreDataTranscriptStoreTests: XCTestCase {

    private var controller: PersistenceController!
    private var store: CoreDataTranscriptStore!

    override func setUp() {
        super.setUp()
        controller = PersistenceController(inMemory: true)
        store = CoreDataTranscriptStore(context: controller.viewContext)
    }

    func testSaveAndFetchTranscript() async throws {
        let transcript = Transcript(rawText: "hello world", mode: .general, source: .keyboard)
        try await store.save(transcript)
        let fetched = try await store.fetch(id: transcript.id)
        XCTAssertNotNil(fetched)
        XCTAssertEqual(fetched?.rawText, "hello world")
        XCTAssertEqual(fetched?.mode, .general)
        XCTAssertEqual(fetched?.source, .keyboard)
    }

    func testFetchAllReturnsNewestFirst() async throws {
        let older = Transcript(rawText: "first", mode: .general, source: .app, createdAt: Date().addingTimeInterval(-60))
        let newer = Transcript(rawText: "second", mode: .email, source: .app, createdAt: Date())
        try await store.save(older)
        try await store.save(newer)
        let all = try await store.fetchAll()
        XCTAssertEqual(all.count, 2)
        XCTAssertEqual(all.first?.rawText, "second")
    }

    func testDeleteTranscript() async throws {
        let transcript = Transcript(rawText: "delete me", mode: .general, source: .app)
        try await store.save(transcript)
        try await store.delete(id: transcript.id)
        let fetched = try await store.fetch(id: transcript.id)
        XCTAssertNil(fetched)
    }

    func testFetchUnsyncedTranscripts() async throws {
        let unsynced = Transcript(rawText: "not synced", mode: .general, source: .keyboard)
        let synced = Transcript(rawText: "synced", mode: .general, source: .app, syncedAt: Date())
        try await store.save(unsynced)
        try await store.save(synced)
        let results = try await store.fetchUnsyncedTranscripts()
        XCTAssertEqual(results.count, 1)
        XCTAssertEqual(results.first?.rawText, "not synced")
    }

    func testSaveTranscriptWithEnhancedText() async throws {
        let transcript = Transcript(rawText: "raw input", enhancedText: "Enhanced Output", mode: .email, source: .app)
        try await store.save(transcript)
        let fetched = try await store.fetch(id: transcript.id)
        XCTAssertEqual(fetched?.enhancedText, "Enhanced Output")
    }
}
