import WidgetKit
import SwiftUI

// MARK: - Shared payload

struct WidgetPayload: Codable {
    struct Session: Codable {
        let title: String
        let timeLabel: String
        let muscleGroups: String?
    }
    struct Meal: Codable {
        let title: String
        let kcalLabel: String
        let mealType: String?
    }
    let nextSession: Session?
    let nextMeal: Meal?
    let updatedAt: String?
}

// MARK: - Timeline

struct TanrenEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload
}

struct TanrenProvider: TimelineProvider {
    private static let suiteName = "group.app.tanren.shared"
    private static let key = "widgetPayload"

    func placeholder(in context: Context) -> TanrenEntry {
        TanrenEntry(date: .now, payload: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TanrenEntry) -> Void) {
        completion(TanrenEntry(date: .now, payload: loadPayload()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TanrenEntry>) -> Void) {
        let payload = loadPayload()
        let entry = TanrenEntry(date: .now, payload: payload)

        // Refresh in 30 minutes or at the next relevant time
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))
        completion(timeline)
    }

    private func loadPayload() -> WidgetPayload {
        guard let defaults = UserDefaults(suiteName: Self.suiteName),
              let data = defaults.data(forKey: Self.key),
              let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data)
        else {
            return .empty
        }
        return payload
    }
}

extension WidgetPayload {
    static let empty = WidgetPayload(nextSession: nil, nextMeal: nil, updatedAt: nil)
    static let placeholder = WidgetPayload(
        nextSession: .init(title: "PUSH DAY", timeLabel: "Aujourd'hui", muscleGroups: "Pecs · Épaules · Triceps"),
        nextMeal: .init(title: "Poulet grillé & riz", kcalLabel: "620 kcal", mealType: "Déjeuner"),
        updatedAt: nil
    )
}

// MARK: - Widget bundle

@main
struct TanrenWidgetBundle: WidgetBundle {
    var body: some Widget {
        TanrenSessionWidget()
    }
}

struct TanrenSessionWidget: Widget {
    let kind = "TanrenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TanrenProvider()) { entry in
            TanrenWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color.tanrenBg
                }
        }
        .configurationDisplayName("Tanren")
        .description("Ta prochaine séance et ton prochain repas.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
