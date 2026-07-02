import SwiftUI
import WidgetKit

// MARK: - Main view dispatcher

struct TanrenWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: TanrenEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Small (session focus)

struct SmallWidgetView: View {
    let entry: TanrenEntry

    var body: some View {
        let session = entry.payload.nextSession

        VStack(alignment: .leading, spacing: 0) {
            // Red accent bar
            Rectangle()
                .fill(Color.forgeRed)
                .frame(width: 24, height: 3)
                .padding(.bottom, 8)

            // Label
            Text("SÉANCE")
                .font(.custom("BarlowCondensed-Medium", size: 10))
                .tracking(1.6)
                .foregroundStyle(Color.tanrenTextMute)
                .padding(.bottom, 4)

            if let session = session {
                Text(session.title.uppercased())
                    .font(.custom("BarlowCondensed-Bold", size: 17))
                    .foregroundStyle(Color.tanrenText)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                    .padding(.bottom, 4)

                Text(session.timeLabel)
                    .font(.custom("BarlowCondensed-Regular", size: 12))
                    .foregroundStyle(Color.tanrenTextDim)
                    .lineLimit(1)

                if let muscles = session.muscleGroups {
                    Text(muscles)
                        .font(.custom("BarlowCondensed-Regular", size: 10))
                        .foregroundStyle(Color.tanrenTextMute)
                        .lineLimit(1)
                        .padding(.top, 2)
                }
            } else {
                Text("Aucune séance planifiée")
                    .font(.custom("BarlowCondensed-Regular", size: 13))
                    .foregroundStyle(Color.tanrenTextDim)
                    .lineLimit(2)
            }

            Spacer(minLength: 0)

            // Brand mark
            HStack(spacing: 4) {
                Text("鍛")
                    .font(.custom("NotoSerifJP-Bold", size: 8))
                    .foregroundStyle(Color.forgeRed.opacity(0.5))
                Text("TANREN")
                    .font(.custom("BarlowCondensed-Bold", size: 8))
                    .tracking(1.2)
                    .foregroundStyle(Color.tanrenTextMute.opacity(0.5))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "tanren://workout/preview"))
    }
}

// MARK: - Medium (session + meal)

struct MediumWidgetView: View {
    let entry: TanrenEntry

    var body: some View {
        HStack(spacing: 0) {
            // Session zone
            Link(destination: URL(string: "tanren://workout/preview")!) {
                SessionZone(session: entry.payload.nextSession)
            }

            // Divider
            Rectangle()
                .fill(Color.tanrenBorder)
                .frame(width: 1)
                .padding(.vertical, 8)

            // Meal zone
            Link(destination: URL(string: "tanren://diet")!) {
                MealZone(meal: entry.payload.nextMeal)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct SessionZone: View {
    let session: WidgetPayload.Session?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(Color.forgeRed)
                .frame(width: 20, height: 3)
                .padding(.bottom, 6)

            Text("SÉANCE")
                .font(.custom("BarlowCondensed-Medium", size: 10))
                .tracking(1.6)
                .foregroundStyle(Color.tanrenTextMute)
                .padding(.bottom, 4)

            if let session = session {
                Text(session.title.uppercased())
                    .font(.custom("BarlowCondensed-Bold", size: 15))
                    .foregroundStyle(Color.tanrenText)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                    .padding(.bottom, 3)

                Text(session.timeLabel)
                    .font(.custom("BarlowCondensed-Regular", size: 11))
                    .foregroundStyle(Color.tanrenTextDim)
                    .lineLimit(1)

                if let muscles = session.muscleGroups {
                    Text(muscles)
                        .font(.custom("BarlowCondensed-Regular", size: 10))
                        .foregroundStyle(Color.tanrenTextMute)
                        .lineLimit(1)
                        .padding(.top, 2)
                }
            } else {
                Text("Aucune séance planifiée")
                    .font(.custom("BarlowCondensed-Regular", size: 12))
                    .foregroundStyle(Color.tanrenTextDim)
                    .lineLimit(2)
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.horizontal, 12)
    }
}

struct MealZone: View {
    let meal: WidgetPayload.Meal?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(Color.forgeRed)
                .frame(width: 20, height: 3)
                .padding(.bottom, 6)

            Text("REPAS")
                .font(.custom("BarlowCondensed-Medium", size: 10))
                .tracking(1.6)
                .foregroundStyle(Color.tanrenTextMute)
                .padding(.bottom, 4)

            if let meal = meal {
                Text(meal.title.uppercased())
                    .font(.custom("BarlowCondensed-Bold", size: 15))
                    .foregroundStyle(Color.tanrenText)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                    .padding(.bottom, 3)

                HStack(spacing: 6) {
                    if let mealType = meal.mealType {
                        Text(mealType)
                            .font(.custom("BarlowCondensed-Regular", size: 11))
                            .foregroundStyle(Color.tanrenTextDim)
                    }
                    Text(meal.kcalLabel)
                        .font(.custom("BarlowCondensed-Bold", size: 11))
                        .foregroundStyle(Color.forgeRed)
                }
                .lineLimit(1)
            } else {
                Text("Aucun repas planifié")
                    .font(.custom("BarlowCondensed-Regular", size: 12))
                    .foregroundStyle(Color.tanrenTextDim)
                    .lineLimit(2)
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.horizontal, 12)
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    TanrenSessionWidget()
} timeline: {
    TanrenEntry(date: .now, payload: .placeholder)
    TanrenEntry(date: .now, payload: .empty)
}

#Preview("Medium", as: .systemMedium) {
    TanrenSessionWidget()
} timeline: {
    TanrenEntry(date: .now, payload: .placeholder)
    TanrenEntry(date: .now, payload: .empty)
}
