import Foundation

public struct AppSettings: Identifiable, Codable, Sendable, Equatable {
    public let id: UUID
    public let defaultMode: TranscriptMode
    public let language: String
    public let preferences: [String: String]
    public let updatedAt: Date

    public init(
        id: UUID = UUID(),
        defaultMode: TranscriptMode = .general,
        language: String = "en-US",
        preferences: [String: String] = [:],
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.defaultMode = defaultMode
        self.language = language
        self.preferences = preferences
        self.updatedAt = updatedAt
    }

    public static let defaults = AppSettings()

    public func withDefaultMode(_ mode: TranscriptMode) -> AppSettings {
        AppSettings(id: id, defaultMode: mode, language: language, preferences: preferences, updatedAt: Date())
    }
}
