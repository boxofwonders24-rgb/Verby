import SwiftUI

public enum VerbyFonts {
    public static func body(_ size: CGFloat = 15) -> Font {
        .system(size: size, weight: .regular)
    }

    public static func heading(_ size: CGFloat = 20) -> Font {
        .system(size: size, weight: .semibold, design: .default)
    }

    public static func mono(_ size: CGFloat = 13) -> Font {
        .system(size: size, weight: .regular, design: .monospaced)
    }

    public static func logo(_ size: CGFloat = 24) -> Font {
        .system(size: size, weight: .bold, design: .rounded)
    }

    public static func caption(_ size: CGFloat = 12) -> Font {
        .system(size: size, weight: .medium)
    }
}
