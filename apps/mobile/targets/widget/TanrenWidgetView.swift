import SwiftUI
import WidgetKit

// MARK: - Main view dispatcher

struct TanrenWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: TanrenEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallSessionWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallSessionWidgetView(entry: entry)
        }
    }
}

// MARK: - Dumbbell icon

struct DumbbellIcon: View {
    let size: CGFloat
    let strokeColor: Color
    let accentColor: Color

    var body: some View {
        Canvas { context, canvasSize in
            let s = min(canvasSize.width, canvasSize.height)
            let cx = canvasSize.width / 2
            let cy = canvasSize.height / 2
            let r = s * 0.33

            context.stroke(
                Path { p in p.addArc(center: CGPoint(x: cx, y: cy), radius: r, startAngle: .zero, endAngle: .degrees(360), clockwise: false) },
                with: .color(strokeColor),
                lineWidth: s * 0.06
            )
            context.fill(Path(CGRect(x: cx - s * 0.035, y: s * 0.06, width: s * 0.07, height: s * 0.88)), with: .color(strokeColor))
            context.fill(Path(CGRect(x: s * 0.06, y: cy - s * 0.035, width: s * 0.88, height: s * 0.07)), with: .color(strokeColor))
            context.fill(Path { p in p.addArc(center: CGPoint(x: cx, y: cy), radius: s * 0.12, startAngle: .zero, endAngle: .degrees(360), clockwise: false) }, with: .color(accentColor))
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Small session

struct SmallSessionWidgetView: View {
    let entry: TanrenEntry

    private var sessionURL: URL {
        if let tid = entry.payload.nextSession?.templateId {
            return URL(string: "tanren://workout/preview?templateId=\(tid)")!
        }
        return URL(string: "tanren://")!
    }

    var body: some View {
        let session = entry.payload.nextSession
        let isEmpty = session == nil

        HStack(spacing: 0) {
            Rectangle()
                .fill(isEmpty ? Color.tanrenTextMute.opacity(0.16) : Color.forgeRed)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 0) {
                // Head
                HStack(spacing: 8) {
                    if !isEmpty {
                        DumbbellIcon(size: 20, strokeColor: Color.tanrenText, accentColor: Color.forgeRed)
                    }
                    Text("SÉANCE")
                        .font(.custom("BarlowCondensed-SemiBold", size: 11))
                        .tracking(2.5)
                        .foregroundStyle(Color.tanrenTextMute)
                }

                Spacer(minLength: 4)

                // Body
                VStack(alignment: .leading, spacing: 0) {
                    if let session = session {
                        Text(session.title.uppercased())
                            .font(.custom("BarlowCondensed-Bold", size: 32))
                            .foregroundStyle(Color.tanrenText)
                            .lineLimit(3)
                            .minimumScaleFactor(0.55)
                            .fixedSize(horizontal: false, vertical: true)
                    } else {
                        Text("Aucune séance planifiée")
                            .font(.custom("BarlowCondensed-SemiBold", size: 19))
                            .foregroundStyle(Color.tanrenTextMute)
                            .lineLimit(2)
                    }
                }
                .layoutPriority(1)

                Spacer(minLength: 4)

                // Foot
                if let session = session {
                    Text(session.timeLabel.uppercased())
                        .font(.custom("BarlowCondensed-SemiBold", size: 10))
                        .tracking(2)
                        .foregroundStyle(Color.tanrenTextMute)
                }
            }
            .padding(.leading, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(sessionURL)
    }
}

// MARK: - Small diet

struct SmallDietWidgetView: View {
    let entry: TanrenEntry

    var body: some View {
        let meal = entry.payload.nextMeal
        let isEmpty = meal == nil

        HStack(spacing: 0) {
            Rectangle()
                .fill(isEmpty ? Color.tanrenTextMute.opacity(0.16) : Color.forgeRed)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 0) {
                // Head
                HStack(spacing: 8) {
                    if !isEmpty {
                        Circle()
                            .fill(Color.tanrenAmber)
                            .frame(width: 7, height: 7)
                    }
                    Text(meal?.mealType?.uppercased() ?? "REPAS")
                        .font(.custom("BarlowCondensed-SemiBold", size: 11))
                        .tracking(2.5)
                        .foregroundStyle(Color.tanrenTextMute)
                }

                Spacer(minLength: 4)

                // Body
                VStack(alignment: .leading, spacing: 2) {
                    if let meal = meal {
                        Text(meal.title)
                            .font(.custom("BarlowCondensed-Bold", size: 24))
                            .foregroundStyle(Color.tanrenText)
                            .lineLimit(3)
                            .minimumScaleFactor(0.6)
                            .fixedSize(horizontal: false, vertical: true)

                        HStack(spacing: 0) {
                            Text("≈")
                                .font(.custom("JetBrainsMono-Bold", size: 15))
                                .foregroundStyle(Color.forgeRed)
                            Text(meal.kcalLabel)
                                .font(.custom("JetBrainsMono-Bold", size: 15))
                                .foregroundStyle(Color.tanrenText)
                            Text(" kcal")
                                .font(.custom("JetBrainsMono-Regular", size: 10))
                                .foregroundStyle(Color.tanrenTextMute)
                        }
                    } else {
                        Text("Aucun repas planifié")
                            .font(.custom("BarlowCondensed-SemiBold", size: 19))
                            .foregroundStyle(Color.tanrenTextMute)
                            .lineLimit(2)
                    }
                }
                .layoutPriority(1)

                Spacer(minLength: 4)

                // Foot — macros
                if let meal = meal,
                   let p = meal.proteinG, let c = meal.carbsG, let f = meal.fatG {
                    Text("P \(p) · G \(c) · L \(f) g")
                        .font(.custom("JetBrainsMono-Regular", size: 9.5))
                        .foregroundStyle(Color.tanrenText.opacity(0.5))
                }
            }
            .padding(.leading, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "tanren://diet"))
    }
}

// MARK: - Medium (session + meal)

struct MediumWidgetView: View {
    let entry: TanrenEntry

    private var sessionURL: URL {
        if let tid = entry.payload.nextSession?.templateId {
            return URL(string: "tanren://workout/preview?templateId=\(tid)")!
        }
        return URL(string: "tanren://")!
    }

    var body: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(entry.payload.nextSession == nil && entry.payload.nextMeal == nil
                      ? Color.tanrenTextMute.opacity(0.16)
                      : Color.forgeRed)
                .frame(width: 4)

            HStack(spacing: 0) {
                Link(destination: sessionURL) {
                    MediumSessionZone(session: entry.payload.nextSession)
                }

                Rectangle()
                    .fill(Color.tanrenBorder.opacity(0.5))
                    .frame(width: 1)
                    .padding(.vertical, 8)

                Link(destination: URL(string: "tanren://diet")!) {
                    MediumMealZone(meal: entry.payload.nextMeal)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct MediumSessionZone: View {
    let session: WidgetPayload.Session?

    var body: some View {
        let isEmpty = session == nil

        VStack(alignment: .leading, spacing: 0) {
            // Head — top
            HStack(spacing: 8) {
                if !isEmpty {
                    DumbbellIcon(size: 18, strokeColor: Color.tanrenText, accentColor: Color.forgeRed)
                }
                Text("SÉANCE")
                    .font(.custom("BarlowCondensed-SemiBold", size: 11))
                    .tracking(2.5)
                    .foregroundStyle(Color.tanrenTextMute)
            }

            // Title — right after head
            VStack(alignment: .leading, spacing: 0) {
                if let session = session {
                    Text(session.title.uppercased())
                        .font(.custom("BarlowCondensed-Bold", size: 28))
                        .foregroundStyle(Color.tanrenText)
                        .lineLimit(3)
                        .minimumScaleFactor(0.55)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("Aucune séance planifiée")
                        .font(.custom("BarlowCondensed-SemiBold", size: 19))
                        .foregroundStyle(Color.tanrenTextMute)
                        .lineLimit(2)
                }
            }
            .layoutPriority(1)
            .padding(.top, 6)

            Spacer(minLength: 0)

            // Foot — bottom
            if let session = session {
                Text(session.timeLabel.uppercased())
                    .font(.custom("BarlowCondensed-SemiBold", size: 10))
                    .tracking(2)
                    .foregroundStyle(Color.tanrenTextMute)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
    }
}

struct MediumMealZone: View {
    let meal: WidgetPayload.Meal?

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(alignment: .leading, spacing: 0) {
                // Head — top
                HStack(spacing: 8) {
                    if meal != nil {
                        Circle()
                            .fill(Color.tanrenAmber)
                            .frame(width: 7, height: 7)
                    }
                    Text(meal?.mealType?.uppercased() ?? "REPAS")
                        .font(.custom("BarlowCondensed-SemiBold", size: 11))
                        .tracking(2.5)
                        .foregroundStyle(Color.tanrenTextMute)
                }

                // Title + kcal — right after head
                VStack(alignment: .leading, spacing: 2) {
                    if let meal = meal {
                        Text(meal.title)
                            .font(.custom("BarlowCondensed-Bold", size: 22))
                            .foregroundStyle(Color.tanrenText)
                            .lineLimit(3)
                            .minimumScaleFactor(0.6)
                            .fixedSize(horizontal: false, vertical: true)

                        HStack(spacing: 0) {
                            Text("≈")
                                .font(.custom("JetBrainsMono-Bold", size: 15))
                                .foregroundStyle(Color.forgeRed)
                            Text(meal.kcalLabel)
                                .font(.custom("JetBrainsMono-Bold", size: 15))
                                .foregroundStyle(Color.tanrenText)
                            Text(" kcal")
                                .font(.custom("JetBrainsMono-Regular", size: 10))
                                .foregroundStyle(Color.tanrenTextMute)
                        }
                    } else {
                        Text("Aucun repas planifié")
                            .font(.custom("BarlowCondensed-SemiBold", size: 19))
                            .foregroundStyle(Color.tanrenTextMute)
                            .lineLimit(2)
                    }
                }
                .layoutPriority(1)
                .padding(.top, 6)

                Spacer(minLength: 0)

                // Foot — bottom
                if let meal = meal,
                   let p = meal.proteinG, let c = meal.carbsG, let f = meal.fatG {
                    Text("P \(p) · G \(c) · L \(f) g")
                        .font(.custom("JetBrainsMono-Regular", size: 9.5))
                        .foregroundStyle(Color.tanrenText.opacity(0.5))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(.horizontal, 18)
            .padding(.vertical, 16)

            if meal != nil {
                Text("鍛錬")
                    .font(.custom("NotoSerifJP-Bold", size: 15))
                    .foregroundStyle(Color.tanrenText.opacity(0.07))
                    .padding(.trailing, 10)
                    .padding(.bottom, 6)
            }
        }
    }
}

// MARK: - Previews

#Preview("Small Session", as: .systemSmall) {
    TanrenSessionWidget()
} timeline: {
    TanrenEntry(date: .now, payload: .placeholder)
    TanrenEntry(date: .now, payload: .empty)
}

#Preview("Small Diet", as: .systemSmall) {
    TanrenDietWidget()
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
