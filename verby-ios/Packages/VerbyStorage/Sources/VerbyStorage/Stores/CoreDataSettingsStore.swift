import CoreData
import VerbyCore

public final class CoreDataSettingsStore: SettingsStore, @unchecked Sendable {

    private let context: NSManagedObjectContext

    public init(context: NSManagedObjectContext) {
        self.context = context
    }

    public func load() async throws -> AppSettings {
        try await context.perform { [context] in
            let request = NSFetchRequest<NSManagedObject>(entityName: "SettingsEntity")
            request.fetchLimit = 1
            request.sortDescriptors = [NSSortDescriptor(key: "updatedAt", ascending: false)]

            guard let object = try context.fetch(request).first else {
                return .defaults
            }

            return Self.toAppSettings(object)
        }
    }

    public func save(_ settings: AppSettings) async throws {
        try await context.perform { [context] in
            // Delete existing settings (single-row pattern)
            let deleteRequest = NSFetchRequest<NSManagedObject>(entityName: "SettingsEntity")
            let existing = try context.fetch(deleteRequest)
            for object in existing {
                context.delete(object)
            }

            // Insert new settings
            let entity = NSEntityDescription.insertNewObject(forEntityName: "SettingsEntity", into: context)
            entity.setValue(settings.id, forKey: "id")
            entity.setValue(settings.defaultMode.rawValue, forKey: "defaultMode")
            entity.setValue(settings.language, forKey: "language")
            entity.setValue(settings.updatedAt, forKey: "updatedAt")

            if !settings.preferences.isEmpty {
                let data = try JSONEncoder().encode(settings.preferences)
                entity.setValue(data, forKey: "preferencesData")
            }

            try context.save()
        }
    }

    private static func toAppSettings(_ object: NSManagedObject) -> AppSettings {
        let id = object.value(forKey: "id") as? UUID ?? UUID()
        let modeString = object.value(forKey: "defaultMode") as? String ?? "general"
        let mode = TranscriptMode(rawValue: modeString) ?? .general
        let language = object.value(forKey: "language") as? String ?? "en-US"
        let updatedAt = object.value(forKey: "updatedAt") as? Date ?? Date()

        var preferences: [String: String] = [:]
        if let data = object.value(forKey: "preferencesData") as? Data {
            preferences = (try? JSONDecoder().decode([String: String].self, from: data)) ?? [:]
        }

        return AppSettings(
            id: id,
            defaultMode: mode,
            language: language,
            preferences: preferences,
            updatedAt: updatedAt
        )
    }
}
