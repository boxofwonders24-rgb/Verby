import SwiftUI

public struct VerbyLogo: View {

    public enum Size {
        case small   // 18pt — keyboard header
        case medium  // 22pt — app header
        case large   // 32pt — splash/onboarding

        var fontSize: CGFloat {
            switch self {
            case .small: return 18
            case .medium: return 22
            case .large: return 32
            }
        }

        var iconSize: CGFloat {
            switch self {
            case .small: return 16
            case .medium: return 20
            case .large: return 28
            }
        }
    }

    private let size: Size
    private let showText: Bool

    public init(size: Size = .medium, showText: Bool = true) {
        self.size = size
        self.showText = showText
    }

    public var body: some View {
        HStack(spacing: size == .small ? 4 : 8) {
            // "V" icon with gradient fill
            Text("V")
                .font(.system(size: size.iconSize, weight: .bold, design: .rounded))
                .foregroundStyle(VerbyGradients.primary)
                .frame(width: size.iconSize + 4, height: size.iconSize + 4)
                .background(VerbyColors.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: size == .small ? 4 : 6))

            if showText {
                GradientText(
                    "erby",
                    font: .system(size: size.fontSize, weight: .semibold),
                    gradient: VerbyGradients.primary
                )
            }
        }
    }
}
