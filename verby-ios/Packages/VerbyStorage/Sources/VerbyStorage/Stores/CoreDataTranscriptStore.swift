import CoreData
import VerbyCore

public final class CoreDataTranscriptStore: TranscriptStore, @unchecked Sendable {

    private let context: NSManagedObjectContext

    public init(context: NSManagedObjectContext) {
        self.context = context
    }

    public func save(_ transcript: Transcript) async throws {
        try await context.perform { [context] in
            let entity = NSEntityDescription.insertNewObject(forEntityName: "TranscriptEntity", into: context)
            entity.setValue(transcript.id, forKey: "id")
            entity.setValue(transcript.rawText, forKey: "rawText")
            entity.setValue(transcript.enhancedText, forKey: "enhancedText")
            entity.setValue(transcript.mode.rawValue, forKey: "mode")
            entity.setValue(transcript.source.rawValue, forKey: "source")
            entity.setValue(transcript.deviceId, forKey: "deviceId")
            entity.setValue(transcript.createdAt, forKey: "createdAt")
            entity.setValue(transcript.syncedAt, forKey: "syncedAt")
            try context.save()
        }
    }

    public func fetchAll() async throws -> [Transcript] {
        try await context.perform { [context] in
            let request = NSFetchRequest<NSManagedObject>(entityName: "TranscriptEntity")
            request.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: false)]
            let results = try context.fetch(request)
            return results.compactMap { Self.toTranscript($0) }
        }
    }

    public func fetch(id: UUID) async throws -> Transcript? {
        try await context.perform { [context] in
            let request = NSFetchRequest<NSManagedObject>(entityName: "TranscriptEntity")
            request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
            request.fetchLimit = 1
            let results = try context.fetch(request)
            return results.first.flatMap { Self.toTranscript($0) }
        }
    }

    public func delete(id: UUID) async throws {
        try await context.perform { [context] in
            let request = NSFetchRequest<NSManagedObject>(entityName: "TranscriptEntity")
            request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
            let results = try context.fetch(request)
            for object in results {
                context.delete(object)
            }
            try context.save()
        }
    }

    public func fetchUnsyncedTranscripts() async throws -> [Transcript] {
        try await context.perform { [context] in
            let request = NSFetchRequest<NSManagedObject>(entityName: "TranscriptEntity")
            request.predicate = NSPredicate(format: "syncedAt == nil")
            request.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: true)]
            let results = try context.fetch(request)
            return results.compactMap { Self.toTranscript($0) }
        }
    }

    private static func toTranscript(_ object: NSManagedObject) -> Transcript? {
        guard
            let id = object.value(forKey: "id") as? UUID,
            let rawText = object.value(forKey: "rawText") as? String,
            let modeString = object.value(forKey: "mode") as? String,
            let mode = TranscriptMode(rawValue: modeString),
            let sourceString = object.value(forKey: "source") as? String,
            let source = TranscriptSource(rawValue: sourceString),
            let createdAt = object.value(forKey: "createdAt") as? Date
        else { return nil }

        return Transcript(
            id: id,
            rawText: rawText,
            enhancedText: object.value(forKey: "enhancedText") as? String,
            mode: mode,
            source: source,
            deviceId: object.value(forKey: "deviceId") as? UUID,
            createdAt: createdAt,
            syncedAt: object.value(forKey: "syncedAt") as? Date
        )
    }
}
