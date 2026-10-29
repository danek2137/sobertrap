#pragma once

#include <QJsonObject>
#include <QWidget>

class CrosshairOverlay final : public QWidget {
public:
    explicit CrosshairOverlay(QWidget* parent = nullptr);
    void setOptions(const QJsonObject& options);

protected:
    void paintEvent(QPaintEvent* event) override;

private:
    QString m_type = QStringLiteral("cross");
    QColor m_color = QColor(QStringLiteral("#00ff00"));
    int m_size = 5;
    qreal m_opacity = 0.8;
};
