import Foundation

public protocol SyncService: Sendable {
    func pushTranscripts(_ transcripts: [Transcript]) async throws
    func pullTranscripts(since: Date?) async throws -> [Transcript]
    func pushSettings(_ settings: AppSettings) async throws
    func pullSettings() async throws -> AppSettings?
}
