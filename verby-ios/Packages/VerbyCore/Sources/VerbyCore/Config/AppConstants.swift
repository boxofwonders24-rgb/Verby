import Foundation

public enum AppConstants {
    public static let appGroupIdentifier = "group.com.syntrix.verby"
    public static let keychainAccessGroup = "com.syntrix.verby.shared"
    public static let supabaseURL = "https://your-project.supabase.co"
    public static let trialDurationDays = 3
    public static let freeUsageLimitPerDay = 20

    public enum KeychainKeys {
        public static let authToken = "com.syntrix.verby.authToken"
        public static let refreshToken = "com.syntrix.verby.refreshToken"
    }

    public enum Claude {
        public static let enhancementModel = "claude-sonnet-4-20250514"
        public static let cleanupModel = "claude-haiku-4-5-20251001"
        public static let maxTokensEnhancement = 1024
        public static let maxTokensCleanup = 512
    }
}
