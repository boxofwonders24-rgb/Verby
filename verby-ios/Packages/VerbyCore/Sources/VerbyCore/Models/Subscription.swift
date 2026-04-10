import Foundation

public enum SubscriptionTier: String, Codable, Sendable {
    case trial
    case free
    case pro
}

public struct Subscription: Identifiable, Codable, Sendable, Equatable {
    public let id: UUID
    public let tier: SubscriptionTier
    public let trialStartedAt: Date?
    public let trialEndsAt: Date?
    public let storeReceipt: String?
    public let stripeId: String?
    public let expiresAt: Date?

    public init(
        id: UUID = UUID(),
        tier: SubscriptionTier,
        trialStartedAt: Date? = nil,
        trialEndsAt: Date? = nil,
        storeReceipt: String? = nil,
        stripeId: String? = nil,
        expiresAt: Date? = nil
    ) {
        self.id = id
        self.tier = tier
        self.trialStartedAt = trialStartedAt
        self.trialEndsAt = trialEndsAt
        self.storeReceipt = storeReceipt
        self.stripeId = stripeId
        self.expiresAt = expiresAt
    }

    public func isTrialActive(asOf date: Date = Date()) -> Bool {
        guard tier == .trial, let endsAt = trialEndsAt else { return false }
        return date < endsAt
    }

    public func hasAIAccess(asOf date: Date = Date()) -> Bool {
        switch tier {
        case .pro: return true
        case .trial: return isTrialActive(asOf: date)
        case .free: return false
        }
    }
}
