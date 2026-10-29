#include "crosshair_overlay.h"

#include <QGuiApplication>
#include <QPainter>
#include <QScreen>

CrosshairOverlay::CrosshairOverlay(QWidget* parent)
    : QWidget(parent,
        Qt::Tool | Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint |
        Qt::WindowTransparentForInput | Qt::WindowDoesNotAcceptFocus)
{
    setAttribute(Qt::WA_TranslucentBackground);
    setAttribute(Qt::WA_ShowWithoutActivating);
    setAttribute(Qt::WA_TransparentForMouseEvents);
    setWindowTitle(QStringLiteral("SoberTrapp Crosshair Overlay"));
    if (QScreen* screen = QGuiApplication::primaryScreen()) setGeometry(screen->geometry());
}

void CrosshairOverlay::setOptions(const QJsonObject& options)
{
    const QString type = options.value(QStringLiteral("type")).toString(QStringLiteral("cross"));
    static const QStringList supported = {
        QStringLiteral("dot"), QStringLiteral("cross"), QStringLiteral("circle"),
        QStringLiteral("crosshair"), QStringLiteral("plus")
    };
    if (supported.contains(type)) m_type = type;

    const QColor color(options.value(QStringLiteral("color")).toString(QStringLiteral("#00ff00")));
    if (color.isValid()) m_color = color;
    m_size = qBound(1, options.value(QStringLiteral("size")).toInt(5), 10);
    m_opacity = qBound<qreal>(0.1, options.value(QStringLiteral("opacity")).toDouble(0.8), 1.0);
    update();
}

void CrosshairOverlay::paintEvent(QPaintEvent*)
{
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing, true);
    painter.setOpacity(m_opacity);
    painter.setPen(QPen(m_color, m_type == QStringLiteral("plus") ? 3.0 : 2.0,
                        Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));
    painter.setBrush(m_color);

    const QPointF center(width() / 2.0, height() / 2.0);
    const qreal size = qMax<qreal>(4.0, m_size * 4.0);
    if (m_type == QStringLiteral("dot")) {
        painter.drawEllipse(center, qMax<qreal>(2.0, size * 0.35), qMax<qreal>(2.0, size * 0.35));
    } else if (m_type == QStringLiteral("circle")) {
        painter.setBrush(Qt::NoBrush);
        painter.drawEllipse(center, size * 0.7, size * 0.7);
    } else {
        if (m_type == QStringLiteral("crosshair")) {
            painter.setBrush(Qt::NoBrush);
            painter.drawEllipse(center, size * 0.45, size * 0.45);
        }
        painter.drawLine(QPointF(center.x() - size, center.y()), QPointF(center.x() + size, center.y()));
        painter.drawLine(QPointF(center.x(), center.y() - size), QPointF(center.x(), center.y() + size));
    }
}
