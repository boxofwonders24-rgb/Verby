import SwiftUI

public enum MicButtonState {
    case idle
    case recording
    case processing

    public var isRecording: Bool {
        self == .recording
    }
}

public struct MicButtonConfig {
    public let size: CGFloat

    public init(size: CGFloat = 64) {
        self.size = size
    }
}

public struct MicButton: View {
    public let state: MicButtonState
    public let config: MicButtonConfig
    public let onTap: () -> Void
    public let onHoldStart: () -> Void
    public let onHoldEnd: () -> Void

    public init(
        state: MicButtonState,
        config: MicButtonConfig = MicButtonConfig(),
        onTap: @escaping () -> Void = {},
        onHoldStart: @escaping () -> Void = {},
        onHoldEnd: @escaping () -> Void = {}
    ) {
        self.state = state
        self.config = config
        self.onTap = onTap
        self.onHoldStart = onHoldStart
        self.onHoldEnd = onHoldEnd
    }

    @State private var isPressed = false
    @State private var holdTimer: Timer?

    public var body: some View {
        ZStack {
            // Glow ring
            Circle()
                .fill(glowGradient)
                .frame(width: config.size + 24, height: config.size + 24)
                .opacity(state == .idle ? 0.3 : 0.6)
                .animation(.easeInOut(duration: 0.3), value: state)

            // Main button
            Circle()
                .fill(buttonGradient)
                .frame(width: config.size, height: config.size)
                .shadow(color: shadowColor, radius: 10, y: 4)
                .overlay {
                    buttonIcon
                }
                .scaleEffect(isPressed ? 0.92 : 1.0)
                .animation(.spring(response: 0.2), value: isPressed)
        }
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    guard !isPressed else { return }
                    isPressed = true
                    holdTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { _ in
                        onHoldStart()
                    }
                }
                .onEnded { _ in
                    isPressed = false
                    if let timer = holdTimer, timer.isValid {
                        timer.invalidate()
                        holdTimer = nil
                        onTap()
                    } else {
                        holdTimer = nil
                        onHoldEnd()
                    }
                }
        )
    }

    private var buttonGradient: LinearGradient {
        switch state {
        case .idle:
            return VerbyGradients.primary
        case .recording:
            return VerbyGradients.recording
        case .processing:
            return LinearGradient(
                colors: [VerbyColors.processing, VerbyColors.processing.opacity(0.8)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private var glowGradient: RadialGradient {
        let color: Color = state == .recording ? VerbyColors.secondary : VerbyColors.primary
        return RadialGradient(
            colors: [color.opacity(0.3), .clear],
            center: .center,
            startRadius: 0,
            endRadius: config.size / 2 + 16
        )
    }

    private var shadowColor: Color {
        switch state {
        case .idle: return VerbyColors.primary.opacity(0.35)
        case .recording: return VerbyColors.secondary.opacity(0.4)
        case .processing: return VerbyColors.processing.opacity(0.3)
        }
    }

    @ViewBuilder
    private var buttonIcon: some View {
        switch state {
        case .idle:
            Image(systemName: "mic.fill")
                .font(.system(size: config.size * 0.35))
                .foregroundStyle(.white)
        case .recording:
            Image(systemName: "stop.fill")
                .font(.system(size: config.size * 0.3))
                .foregroundStyle(.white)
        case .processing:
            ProgressView()
                .tint(.white)
        }
    }
}
