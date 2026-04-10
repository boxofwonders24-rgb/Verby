import CoreData
import VerbyCore

public final class PersistenceController: @unchecked Sendable {

    public static let shared = PersistenceController()

    public let container: NSPersistentContainer

    public init(inMemory: Bool = false) {
        let model = Self.createModel()
        container = NSPersistentContainer(name: "Verby", managedObjectModel: model)

        if inMemory {
            let description = NSPersistentStoreDescription()
            description.type = NSInMemoryStoreType
            container.persistentStoreDescriptions = [description]
        } else if let storeURL = AppGroupContainer.containerURL?
            .appendingPathComponent("Verby.sqlite") {
            let description = NSPersistentStoreDescription(url: storeURL)
            container.persistentStoreDescriptions = [description]
        }

        container.loadPersistentStores { _, error in
            if let error {
                fatalError("CoreData failed to load: \(error)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    public var viewContext: NSManagedObjectContext {
        container.viewContext
    }

    public func newBackgroundContext() -> NSManagedObjectContext {
        container.newBackgroundContext()
    }

    // MARK: - Programmatic Model

    private static func createModel() -> NSManagedObjectModel {
        let model = NSManagedObjectModel()

        let transcriptEntity = NSEntityDescription()
        transcriptEntity.name = "TranscriptEntity"
        transcriptEntity.managedObjectClassName = "TranscriptEntity"
        transcriptEntity.properties = [
            attribute("id", .UUIDAttributeType, false),
            attribute("rawText", .stringAttributeType, false),
            attribute("enhancedText", .stringAttributeType, true),
            attribute("mode", .stringAttributeType, false),
            attribute("source", .stringAttributeType, false),
            attribute("deviceId", .UUIDAttributeType, true),
            attribute("createdAt", .dateAttributeType, false),
            attribute("syncedAt", .dateAttributeType, true)
        ]

        let settingsEntity = NSEntityDescription()
        settingsEntity.name = "SettingsEntity"
        settingsEntity.managedObjectClassName = "SettingsEntity"
        settingsEntity.properties = [
            attribute("id", .UUIDAttributeType, false),
            attribute("defaultMode", .stringAttributeType, false),
            attribute("language", .stringAttributeType, false),
            attribute("preferencesData", .binaryDataAttributeType, true),
            attribute("updatedAt", .dateAttributeType, false)
        ]

        model.entities = [transcriptEntity, settingsEntity]
        return model
    }

    private static func attribute(
        _ name: String,
        _ type: NSAttributeType,
        _ optional: Bool
    ) -> NSAttributeDescription {
        let attr = NSAttributeDescription()
        attr.name = name
        attr.attributeType = type
        attr.isOptional = optional
        return attr
    }
}
