import Foundation

public struct UserProfile: Identifiable, Codable, Sendable, Equatable {
    public let id: UUID
    public let email: String?
    public let displayName: String
    public let createdAt: Date

    public init(id: UUID = UUID(), email: String? = nil, displayName: String, createdAt: Date = Date()) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.createdAt = createdAt
    }
}
