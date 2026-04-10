import VerbyCore

public enum VerbyStorageFactory {

    public static func makeTranscriptStore(
        persistence: PersistenceController = .shared
    ) -> TranscriptStore {
        CoreDataTranscriptStore(context: persistence.viewContext)
    }

    public static func makeSettingsStore(
        persistence: PersistenceController = .shared
    ) -> SettingsStore {
        CoreDataSettingsStore(context: persistence.viewContext)
    }
}
