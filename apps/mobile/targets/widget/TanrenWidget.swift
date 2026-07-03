import WidgetKit
import SwiftUI

// MARK: - Shared payload

struct WidgetPayload: Codable {
    struct Session: Codable {
        let title: String
        let timeLabel: String
        let muscleGroups: String?
        let templateId: String?
    }
    struct Meal: Codable {
        let title: String
        let kcalLabel: String
        let mealType: String?
        let proteinG: Int?
        let carbsG: Int?
        let fatG: Int?
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
        nextSession: .init(title: "Push A", timeLabel: "Aujourd'hui", muscleGroups: "Pecs · Épaules · Triceps", templateId: nil),
        nextMeal: .init(title: "Poulet basquaise", kcalLabel: "720", mealType: "Déjeuner", proteinG: 52, carbsG: 68, fatG: 24),
        updatedAt: nil
    )
}

// MARK: - Widget bundle

@main
struct TanrenWidgetBundle: WidgetBundle {
    var body: some Widget {
        TanrenSessionWidget()
        TanrenDietWidget()
    }
}

struct TanrenDietWidget: Widget {
    let kind = "TanrenDietWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TanrenProvider()) { entry in
            SmallDietWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color.tanrenSurface, Color.tanrenBg], startPoint: .topLeading, endPoint: .bottomTrailing)
                }
        }
        .configurationDisplayName("Tanren — Repas")
        .description("Ton prochain repas du jour.")
        .supportedFamilies([.systemSmall])
    }
}

struct TanrenSessionWidget: Widget {
    let kind = "TanrenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TanrenProvider()) { entry in
            TanrenWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color.tanrenSurface, Color.tanrenBg], startPoint: .topLeading, endPoint: .bottomTrailing)
                }
        }
        .configurationDisplayName("Tanren")
        .description("Ta prochaine séance et ton prochain repas.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
