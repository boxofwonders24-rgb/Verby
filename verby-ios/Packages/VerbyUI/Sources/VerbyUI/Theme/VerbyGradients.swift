import SwiftUI

public enum VerbyGradients {
    /// Primary gradient: #7c3aed → #a855f7
    public static let primary = LinearGradient(
        colors: [VerbyColors.primary, VerbyColors.tertiary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// Extended gradient: #7c3aed → #6366F1 → #818CF8
    public static let extended = LinearGradient(
        colors: [VerbyColors.primary, VerbyColors.secondary, VerbyColors.light],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    /// Recording pulse gradient
    public static let recording = LinearGradient(
        colors: [VerbyColors.secondary, VerbyColors.light],
        startPoint: .top,
        endPoint: .bottom
    )
}
