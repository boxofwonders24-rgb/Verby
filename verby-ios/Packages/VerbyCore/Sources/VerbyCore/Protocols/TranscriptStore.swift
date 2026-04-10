import Foundation

public protocol TranscriptStore: Sendable {
    func save(_ transcript: Transcript) async throws
    func fetchAll() async throws -> [Transcript]
    func fetch(id: UUID) async throws -> Transcript?
    func delete(id: UUID) async throws
    func fetchUnsyncedTranscripts() async throws -> [Transcript]
}
