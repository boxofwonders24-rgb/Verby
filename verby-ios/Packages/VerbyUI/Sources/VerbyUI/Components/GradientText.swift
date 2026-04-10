import SwiftUI

public struct GradientText: View {
    private let text: String
    private let font: Font
    private let gradient: LinearGradient

    public init(
        _ text: String,
        font: Font = .title.bold(),
        gradient: LinearGradient = VerbyGradients.primary
    ) {
        self.text = text
        self.font = font
        self.gradient = gradient
    }

    public var body: some View {
        Text(text)
            .font(font)
            .foregroundStyle(gradient)
    }
}
