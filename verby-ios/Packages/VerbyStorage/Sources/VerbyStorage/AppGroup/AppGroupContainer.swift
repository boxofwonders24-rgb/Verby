import Foundation
import VerbyCore

public enum AppGroupContainer {

    public static var containerURL: URL? {
        FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: AppConstants.appGroupIdentifier
        )
    }

    public static func fileURL(for filename: String) -> URL? {
        containerURL?.appendingPathComponent(filename)
    }
}
