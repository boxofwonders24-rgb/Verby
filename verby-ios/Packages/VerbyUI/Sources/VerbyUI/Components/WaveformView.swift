import SwiftUI

public struct WaveformConfig {
    public let barCount: Int
    public let barWidth: CGFloat
    public let spacing: CGFloat
    public let minHeight: CGFloat
    public let maxHeight: CGFloat

    public init(
        barCount: Int = 10,
        barWidth: CGFloat = 3,
        spacing: CGFloat = 3,
        minHeight: CGFloat = 8,
        maxHeight: CGFloat = 32
    ) {
        self.barCount = barCount
        self.barWidth = barWidth
        self.spacing = spacing
        self.minHeight = minHeight
        self.maxHeight = maxHeight
    }
}

public struct WaveformView: View {
    public let isAnimating: Bool
    public let config: WaveformConfig

    @State private var phases: [Double]

    public init(isAnimating: Bool = true, config: WaveformConfig = WaveformConfig()) {
        self.isAnimating = isAnimating
        self.config = config
        self._phases = State(initialValue: (0..<config.barCount).map { _ in Double.random(in: 0...1) })
    }

    public var body: some View {
        HStack(spacing: config.spacing) {
            ForEach(0..<config.barCount, id: \.self) { index in
                RoundedRectangle(cornerRadius: config.barWidth / 2)
                    .fill(
                        LinearGradient(
                            colors: [VerbyColors.primary, VerbyColors.tertiary],
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(width: config.barWidth, height: barHeight(for: index))
                    .animation(
                        isAnimating
                            ? .easeInOut(duration: 0.4 + Double(index % 3) * 0.15)
                                .repeatForever(autoreverses: true)
                            : .default,
                        value: phases[index]
                    )
            }
        }
        .onAppear {
            guard isAnimating else { return }
            for i in 0..<config.barCount {
                phases[i] = Double.random(in: 0.3...1.0)
            }
        }
        .onChange(of: isAnimating) { active in
            if active {
                for i in 0..<config.barCount {
                    phases[i] = Double.random(in: 0.3...1.0)
                }
            } else {
                for i in 0..<config.barCount {
                    phases[i] = 0.2
                }
            }
        }
    }

    private func barHeight(for index: Int) -> CGFloat {
        let range = config.maxHeight - config.minHeight
        return config.minHeight + range * phases[index]
    }
}
