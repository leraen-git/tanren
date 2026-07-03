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
        let hour: Int?
        let proteinG: Int?
        let carbsG: Int?
        let fatG: Int?
    }
    let nextSession: Session?
    let nextMeal: Meal?
    let todayMeals: [Meal]?
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
        let stored = loadPayload()
        let meals = stored.todayMeals ?? []
        let cal = Calendar.current
        let now = Date.now

        if meals.isEmpty {
            let entry = TanrenEntry(date: now, payload: stored)
            let nextRefresh = cal.date(byAdding: .minute, value: 30, to: now) ?? now
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
            return
        }

        let sortedMeals = meals.sorted { ($0.hour ?? 0) < ($1.hour ?? 0) }
        let currentHour = cal.component(.hour, from: now)
        var entries: [TanrenEntry] = []

        // Find the current meal (last one whose hour has passed) or next upcoming
        let currentMeal = sortedMeals.last { ($0.hour ?? 0) <= currentHour }
            ?? sortedMeals.first

        // Entry for right now with the current meal
        if let meal = currentMeal {
            let payloadNow = WidgetPayload(
                nextSession: stored.nextSession,
                nextMeal: meal,
                todayMeals: meals,
                updatedAt: stored.updatedAt
            )
            entries.append(TanrenEntry(date: now, payload: payloadNow))
        }

        // Future entries at each upcoming meal transition
        for meal in sortedMeals {
            let hour = meal.hour ?? 12
            guard hour > currentHour,
                  let entryDate = cal.date(bySettingHour: hour, minute: 0, second: 0, of: now)
            else { continue }

            let payloadWithMeal = WidgetPayload(
                nextSession: stored.nextSession,
                nextMeal: meal,
                todayMeals: meals,
                updatedAt: stored.updatedAt
            )
            entries.append(TanrenEntry(date: entryDate, payload: payloadWithMeal))
        }

        if entries.isEmpty {
            let fallback = WidgetPayload(
                nextSession: stored.nextSession,
                nextMeal: sortedMeals.first,
                todayMeals: meals,
                updatedAt: stored.updatedAt
            )
            entries.append(TanrenEntry(date: now, payload: fallback))
        }

        let midnight = cal.startOfDay(for: cal.date(byAdding: .day, value: 1, to: now) ?? now)
        completion(Timeline(entries: entries, policy: .after(midnight)))
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
    static let empty = WidgetPayload(nextSession: nil, nextMeal: nil, todayMeals: nil, updatedAt: nil)
    static let placeholder = WidgetPayload(
        nextSession: .init(title: "Push A", timeLabel: "Aujourd'hui", muscleGroups: "Pecs · Épaules · Triceps", templateId: nil),
        nextMeal: .init(title: "Poulet basquaise", kcalLabel: "720", mealType: "Déjeuner", hour: 12, proteinG: 52, carbsG: 68, fatG: 24),
        todayMeals: nil,
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
