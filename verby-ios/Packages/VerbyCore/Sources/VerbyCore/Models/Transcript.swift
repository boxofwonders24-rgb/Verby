import Foundation

public enum TranscriptMode: String, Codable, Sendable, CaseIterable {
    case email
    case note
    case prompt
    case rewrite
    case general
}

public enum TranscriptSource: String, Codable, Sendable {
    case keyboard
    case app
    case actionButton = "action_button"
}

public struct Transcript: Identifiable, Codable, Sendable, Equatable {
    public let id: UUID
    public let rawText: String
    public let enhancedText: String?
    public let mode: TranscriptMode
    public let source: TranscriptSource
    public let deviceId: UUID?
    public let createdAt: Date
    public let syncedAt: Date?

    public init(
        id: UUID = UUID(),
        rawText: String,
        enhancedText: String? = nil,
        mode: TranscriptMode,
        source: TranscriptSource,
        deviceId: UUID? = nil,
        createdAt: Date = Date(),
        syncedAt: Date? = nil
    ) {
        self.id = id
        self.rawText = rawText
        self.enhancedText = enhancedText
        self.mode = mode
        self.source = source
        self.deviceId = deviceId
        self.createdAt = createdAt
        self.syncedAt = syncedAt
    }

    public func withEnhancedText(_ text: String) -> Transcript {
        Transcript(
            id: id, rawText: rawText, enhancedText: text, mode: mode,
            source: source, deviceId: deviceId, createdAt: createdAt, syncedAt: syncedAt
        )
    }
}
