import Foundation

public enum DevicePlatform: String, Codable, Sendable {
    case ios
    case macos
}

public struct Device: Identifiable, Codable, Sendable, Equatable {
    public let id: UUID
    public let platform: DevicePlatform
    public let deviceName: String
    public let lastSyncedAt: Date?

    public init(id: UUID = UUID(), platform: DevicePlatform, deviceName: String, lastSyncedAt: Date? = nil) {
        self.id = id
        self.platform = platform
        self.deviceName = deviceName
        self.lastSyncedAt = lastSyncedAt
    }
}
