#include "main_window.h"

#include "crosshair_overlay.h"

#include <QAbstractButton>
#include <QApplication>
#include <QCloseEvent>
#include <QColorDialog>
#include <QComboBox>
#include <QDateTime>
#include <QDesktopServices>
#include <QDialog>
#include <QDialogButtonBox>
#include <QDir>
#include <QFileDialog>
#include <QFile>
#include <QFileInfo>
#include <QFormLayout>
#include <QFrame>
#include <QGuiApplication>
#include <QHeaderView>
#include <QInputDialog>
#include <QImageReader>
#include <QLabel>
#include <QLineEdit>
#include <QMessageBox>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QProcess>
#include <QProgressDialog>
#include <QShortcut>
#include <QScrollArea>
#include <QScrollBar>
#include <QSlider>
#include <QSpinBox>
#include <QStyle>
#include <QTextCursor>
#include <QTime>
#include <QTimer>
#include <QUuid>
#include <QJsonArray>
#include <QTableWidget>
#include <QTableWidgetItem>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QUrl>
#include <QPainter>
#include <QClipboard>
#include <QSizePolicy>
#include <QStandardPaths>
#include <QSvgRenderer>
#include <QLocale>

#include <algorithm>
#include <iterator>

namespace {
constexpr auto kBackground = "#202020";
constexpr auto kSurface = "#282828";
constexpr auto kSurfaceRaised = "#303030";
constexpr auto kBorder = "#3b3b3b";
constexpr auto kText = "#f2f2f2";
constexpr auto kSecondary = "#b8b8b8";
constexpr auto kTertiary = "#858585";
constexpr auto kAccent = "#a8c0f3";

class ToggleSwitch final : public QAbstractButton {
public:
    explicit ToggleSwitch(QWidget* parent = nullptr) : QAbstractButton(parent)
    {
        setCheckable(true);
        setCursor(Qt::PointingHandCursor);
        setFocusPolicy(Qt::StrongFocus);
        setAccessibleName(QStringLiteral("Setting toggle"));
        setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
    }

    QSize sizeHint() const override { return QSize(42, 22); }

protected:
    void paintEvent(QPaintEvent*) override
    {
        QPainter painter(this);
        painter.setRenderHint(QPainter::Antialiasing, true);
        const QRectF track(1, 2, width() - 2, height() - 4);
        QColor trackColor = isChecked() ? QColor(kAccent) : QColor(QStringLiteral("#606060"));
        if (!isEnabled()) trackColor.setAlpha(100);
        painter.setPen(Qt::NoPen);
        painter.setBrush(trackColor);
        painter.drawRoundedRect(track, track.height() / 2, track.height() / 2);

        const qreal diameter = 14;
        const qreal x = isChecked() ? width() - diameter - 5 : 5;
        const QRectF knob(x, (height() - diameter) / 2.0, diameter, diameter);
        painter.setBrush(isChecked() ? QColor(QStringLiteral("#25334a")) : QColor(QStringLiteral("#eeeeee")));
        painter.drawEllipse(knob);
        if (hasFocus()) {
            painter.setBrush(Qt::NoBrush);
            painter.setPen(QPen(QColor(kAccent), 1));
            painter.drawRoundedRect(track.adjusted(-1, -1, 1, 1), track.height() / 2, track.height() / 2);
        }
    }
};

QLabel* makeLabel(const QString& text, const QString& objectName = QString())
{
    auto* label = new QLabel(text);
    if (!objectName.isEmpty()) label->setObjectName(objectName);
    return label;
}

void clearLayout(QLayout* layout)
{
    if (!layout) return;
    while (QLayoutItem* item = layout->takeAt(0)) {
        if (QWidget* widget = item->widget()) widget->deleteLater();
        if (QLayout* child = item->layout()) clearLayout(child);
        delete item;
    }
}

bool valueIsToggle(const QJsonValue& value)
{
    return value.isBool() || (value.isString() &&
        (value.toString() == QStringLiteral("True") || value.toString() == QStringLiteral("False")));
}

bool valueAsToggle(const QJsonValue& value)
{
    if (value.isBool()) return value.toBool();
    if (value.isString()) return value.toString() == QStringLiteral("True");
    if (value.isDouble()) return value.toDouble() > 0;
    return false;
}

QString valueTypeName(const QJsonValue& value)
{
    if (value.isBool()) return QStringLiteral("Boolean");
    if (value.isDouble()) return QStringLiteral("Number");
    if (value.isString()) return QStringLiteral("String");
    if (value.isArray()) return QStringLiteral("Array");
    if (value.isObject()) return QStringLiteral("Object");
    return QStringLiteral("Null");
}

QString valueDisplay(const QJsonValue& value)
{
    if (value.isString()) return value.toString();
    if (value.isBool()) return value.toBool() ? QStringLiteral("true") : QStringLiteral("false");
    if (value.isDouble()) return QLocale::c().toString(value.toDouble(), 'g', 12);
    if (value.isNull() || value.isUndefined()) return QStringLiteral("null");
    return QString::fromUtf8(QJsonDocument(value.isObject() ? value.toObject() : QJsonObject{
        {QStringLiteral("value"), value}
    }).toJson(QJsonDocument::Compact));
}

QIcon svgIcon(const QString& name)
{
    QString paths;
    if (name == QStringLiteral("home")) {
        paths = QStringLiteral("<path d='m3 10 9-7 9 7'/><path d='M5 9v11h14V9'/><path d='M9 20v-6h6v6'/>");
    } else if (name == QStringLiteral("settings")) {
        paths = QStringLiteral("<path d='M4 6h16M4 12h16M4 18h16'/><circle cx='8' cy='6' r='2'/><circle cx='15' cy='12' r='2'/><circle cx='10' cy='18' r='2'/>");
    } else if (name == QStringLiteral("flags")) {
        paths = QStringLiteral("<path d='M5 21V4'/><path d='M5 5h14l-3 4 3 4H5'/>");
    } else if (name == QStringLiteral("appearance")) {
        paths = QStringLiteral("<circle cx='12' cy='12' r='7'/><path d='M12 2v4M12 18v4M2 12h4M18 12h4'/><circle cx='12' cy='12' r='1'/>");
    } else if (name == QStringLiteral("presets")) {
        paths = QStringLiteral("<path d='m12 3 9 5-9 5-9-5 9-5Z'/><path d='m3 12 9 5 9-5M3 16l9 5 9-5'/>");
    } else if (name == QStringLiteral("profiles")) {
        paths = QStringLiteral("<circle cx='9' cy='8' r='3'/><path d='M3 20v-1a6 6 0 0 1 12 0v1'/><path d='M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1'/>");
    } else if (name == QStringLiteral("backups")) {
        paths = QStringLiteral("<path d='M4 4h16v16H4zM4 9h16M8 4v5M16 4v5'/><path d='M8 13h8M8 16h5'/>");
    } else if (name == QStringLiteral("integrations")) {
        paths = QStringLiteral("<path d='M9 4a2 2 0 1 1 4 0v3h4a2 2 0 0 1 2 2h-3a2 2 0 1 0 0 4h3v3a2 2 0 0 1-2 2h-3v-3a2 2 0 1 0-4 0v3H7a2 2 0 0 1-2-2v-3h3a2 2 0 1 0 0-4H5V9a2 2 0 0 1 2-2h2V4Z'/>");
    } else if (name == QStringLiteral("about")) {
        paths = QStringLiteral("<circle cx='12' cy='12' r='9'/><path d='M12 11v5M12 8h.01'/>");
    } else if (name == QStringLiteral("folder")) {
        paths = QStringLiteral("<path d='M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z'/>");
    } else if (name == QStringLiteral("play")) {
        paths = QStringLiteral("<path d='m8 5 11 7-11 7V5Z'/>");
    }
    if (paths.isEmpty()) return {};
    const QByteArray svg = QStringLiteral(
        "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' "
        "fill='none' stroke='#b7c1c7' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'>%1</svg>")
        .arg(paths).toUtf8();
    QSvgRenderer renderer(svg);
    QPixmap pixmap(64, 64);
    pixmap.fill(Qt::transparent);
    QPainter painter(&pixmap);
    renderer.render(&painter, QRectF(5, 5, 54, 54));
    pixmap.setDevicePixelRatio(2.0);
    return QIcon(pixmap);
}

QJsonObject makePerformancePreset()
{
    QJsonObject flags;
    const QList<QPair<QString, QJsonValue>> values = {
        {"DFFlagDebugPauseVoxelizer", true}, {"DFFlagDebugPerfMode", true},
        {"DFFlagDebugSkipMeshVoxelizer", true}, {"DFFlagTextureQualityOverrideEnabled", true},
        {"DFIntAnimationLodFacsDistanceMax", 0}, {"DFIntAnimationLodFacsDistanceMin", 0},
        {"DFIntAnimationLodFacsVisibilityDenominator", 0}, {"DFIntCSGLevelOfDetailSwitchingDistance", 0},
        {"DFIntCSGLevelOfDetailSwitchingDistanceL12", 0}, {"DFIntCSGLevelOfDetailSwitchingDistanceL23", 0},
        {"DFIntCSGLevelOfDetailSwitchingDistanceL34", 0}, {"DFIntDebugFRMQualityLevelOverride", 1},
        {"DFIntMaxParticleCount", 50}, {"DFIntTextureQualityOverride", 0},
        {"FFlagDebugDisableTelemetryEphemeralCounter", true}, {"FFlagDebugDisableTelemetryEphemeralStat", true},
        {"FFlagDebugDisableTelemetryEventIngest", true}, {"FFlagDebugDisableTelemetryPoint", true},
        {"FFlagDebugDisableTelemetryV2Counter", true}, {"FFlagDebugDisableTelemetryV2Event", true},
        {"FFlagDebugDisableTelemetryV2Stat", true}, {"FFlagDebugDisplayFPS", true},
        {"FFlagDebugGraphicsPreferVulkan", true}, {"FFlagDisableBloom", true},
        {"FFlagDisableDepthOfField", true}, {"FFlagDisableGlobalShadows", true},
        {"FFlagDisablePostFx", true}, {"FFlagEnableReducedLatency", true},
        {"FFlagFastGPULightCulling3", true}, {"FFlagRenderEnableParallelBufferJobs", true},
        {"FFlagRenderSkipForwardRender", true}, {"FFlagRenderVulkanFixMinimizeWindow", true},
        {"FFlagRenderVulkanForceExclusiveFullscreen", true}, {"FIntDebugForceMSAASamples", 1},
        {"FIntFRMMaxGrassDistance", 0}, {"FIntFRMMinGrassDistance", 0},
        {"FIntRenderCharacterLodScale", 30}, {"FIntRenderShadowIntensity", 1},
        {"FIntTerrainOTAMaxTextureSize", 128}, {"FIntTextureCompositorLowResFactor", 1}
    };
    for (const auto& item : values) flags.insert(item.first, item.second);
    return flags;
}

QJsonObject makeBalancedPreset()
{
    QJsonObject flags;
    const QList<QPair<QString, QJsonValue>> values = {
        {"DFFlagDebugPauseVoxelizer", false}, {"DFFlagTextureQualityOverrideEnabled", true},
        {"DFIntDebugFRMQualityLevelOverride", 1}, {"DFIntTaskSchedulerTargetFps", 60},
        {"DFIntTextureQualityOverride", 2}, {"FFlagDebugDisableTelemetryEphemeralCounter", true},
        {"FFlagDebugDisableTelemetryEphemeralStat", true}, {"FFlagDebugDisableTelemetryEventIngest", true},
        {"FFlagDebugDisableTelemetryPoint", true}, {"FFlagDebugDisableTelemetryV2Counter", true},
        {"FFlagDebugDisableTelemetryV2Event", true}, {"FFlagDebugDisableTelemetryV2Stat", true},
        {"FFlagDebugGraphicsPreferVulkan", true}, {"FFlagDisablePostFx", false},
        {"FFlagFastGPULightCulling3", true}, {"FIntDebugForceMSAASamples", 1},
        {"FIntTerrainOTAMaxTextureSize", 256}, {"FIntTextureCompositorLowResFactor", 1}
    };
    for (const auto& item : values) flags.insert(item.first, item.second);
    return flags;
}
}

MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent), m_store()
{
    setWindowTitle(QStringLiteral("SoberTrap Settings"));
    setWindowIcon(svgIcon(QStringLiteral("home")));
    setMinimumSize(840, 480);
    resize(900, 540);

    QString configError;
    m_configLoaded = m_store.loadConfig(&m_config, &configError);
    QString tunerError;
    m_tunerLoaded = m_store.loadTunerConfig(&m_tunerConfig, &tunerError);

    buildInterface();
    m_overlay = new CrosshairOverlay(this);
    appendLog(QStringLiteral("INFO"), QStringLiteral("SoberTrap initialized"));
    if (m_configLoaded) {
        appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Loaded %1 FastFlags from Sober config")
                  .arg(fflags().size()));
        setStatus(QStringLiteral("Configuration loaded"));
    } else {
        appendLog(QStringLiteral("ERROR"), QStringLiteral("Could not load Sober config: %1").arg(configError));
        setStatus(QStringLiteral("Configuration unavailable"), true);
    }
    if (!m_tunerLoaded) {
        appendLog(QStringLiteral("ERROR"), QStringLiteral("Could not load tuner settings: %1").arg(tunerError));
        setStatus(QStringLiteral("Tuner settings could not be loaded"), true);
    }
    updateStatusAndStats();
    switchPage(QStringLiteral("home"));
}

void MainWindow::buildInterface()
{
    // Use the system's native theme; only minimal layout adjustments.
    setStyleSheet(QStringLiteral(R"(
        QScrollArea { border: none; }
        QScrollBar:vertical { width: 10px; }
        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
    )"));

    auto* root = new QWidget();
    root->setObjectName(QStringLiteral("appRoot"));
    auto* rootLayout = new QVBoxLayout(root);
    rootLayout->setContentsMargins(0, 0, 0, 0);
    rootLayout->setSpacing(0);

    auto* body = new QWidget();
    auto* bodyLayout = new QHBoxLayout(body);
    bodyLayout->setContentsMargins(0, 0, 0, 0);
    bodyLayout->setSpacing(0);

    m_sidebar = new QFrame();
    m_sidebar->setObjectName(QStringLiteral("sidebar"));
    m_sidebar->setFixedWidth(228);
    auto* sidebarLayout = new QVBoxLayout(m_sidebar);
    sidebarLayout->setContentsMargins(9, 12, 9, 10);
    sidebarLayout->setSpacing(3);
    m_navigationSearch = new QLineEdit();
    m_navigationSearch->setPlaceholderText(QStringLiteral("Search settings"));
    m_navigationSearch->setClearButtonEnabled(true);
    m_navigationSearch->setFixedHeight(32);
    sidebarLayout->addWidget(m_navigationSearch);
    auto* navScroll = new QScrollArea();
    navScroll->setObjectName(QStringLiteral("navScroll"));
    navScroll->setWidgetResizable(true);
    navScroll->setFrameShape(QFrame::NoFrame);
    navScroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    auto* navigationContent = new QWidget();
    navigationContent->setObjectName(QStringLiteral("navigationContent"));
    m_navigationLayout = new QVBoxLayout(navigationContent);
    m_navigationLayout->setContentsMargins(0, 10, 0, 0);
    m_navigationLayout->setSpacing(2);
    navScroll->setWidget(navigationContent);
    sidebarLayout->addWidget(navScroll, 1);

    auto* sidebarLogo = new QWidget();
    auto* sidebarLogoLayout = new QVBoxLayout(sidebarLogo);
    sidebarLogoLayout->setContentsMargins(0, 8, 0, 4);
    sidebarLogoLayout->setSpacing(2);
    auto* logoLabel = new QLabel();
    logoLabel->setAlignment(Qt::AlignCenter);
    QPixmap pixmap(QStringLiteral("assets/logo.png"));
    if (pixmap.isNull()) {
        pixmap.load(QCoreApplication::applicationDirPath() + QStringLiteral("/assets/logo.png"));
    }
    if (!pixmap.isNull()) {
        logoLabel->setPixmap(pixmap.scaled(64, 64, Qt::KeepAspectRatio, Qt::SmoothTransformation));
    } else {
        logoLabel->setText(QStringLiteral("SoberTrap"));
    }
    auto* infoLabel = new QLabel(QStringLiteral("SoberTrap 1.1.0"));
    infoLabel->setAlignment(Qt::AlignCenter);
    sidebarLogoLayout->addWidget(logoLabel);
    sidebarLogoLayout->addWidget(infoLabel);
    sidebarLayout->addWidget(sidebarLogo);

    bodyLayout->addWidget(m_sidebar);

    m_pages = new QStackedWidget();
    m_pages->setObjectName(QStringLiteral("pages"));
    bodyLayout->addWidget(m_pages, 1);
    rootLayout->addWidget(body, 1);

    auto* footer = new QWidget();
    footer->setObjectName(QStringLiteral("bottomBar"));
    footer->setFixedHeight(48);
    auto* footerLayout = new QHBoxLayout(footer);
    footerLayout->setContentsMargins(15, 0, 16, 0);
    footerLayout->setSpacing(8);
    m_statusLabel = makeLabel(QStringLiteral("Loading configuration…"), QStringLiteral("statusLabel"));
    footerLayout->addWidget(m_statusLabel, 1);
    auto* shortcut = makeLabel(QStringLiteral("Ctrl+S to save"));
    shortcut->setStyleSheet(QString());
    footerLayout->addWidget(shortcut);
    m_saveButton = new QPushButton(QStringLiteral("Save changes"));
    m_saveButton->setObjectName(QStringLiteral("primaryButton"));
    m_saveButton->setEnabled(false);
    connect(m_saveButton, &QPushButton::clicked, this, &MainWindow::saveConfig);
    footerLayout->addWidget(m_saveButton);
    auto* closeButton = new QPushButton(QStringLiteral("Close"));
    closeButton->setObjectName(QStringLiteral("secondaryButton"));
    connect(closeButton, &QPushButton::clicked, this, &QWidget::close);
    footerLayout->addWidget(closeButton);
    rootLayout->addWidget(footer);

    setCentralWidget(root);
    connect(m_navigationSearch, &QLineEdit::textChanged, this, &MainWindow::filterNavigation);

    addPage(QStringLiteral("home"), buildHomePage(), QStringLiteral("Main Menu"),
            svgIcon(QStringLiteral("home")), QStringLiteral("MENU"));
    addPage(QStringLiteral("settings"), buildSettingsPage(), QStringLiteral("Settings"),
            svgIcon(QStringLiteral("settings")), QStringLiteral("MENU"));
    addPage(QStringLiteral("fastflags"), buildFastFlagsPage(), QStringLiteral("Fast Flags"),
            svgIcon(QStringLiteral("flags")), QString());
    addPage(QStringLiteral("appearance"), buildAppearancePage(), QStringLiteral("Appearance"),
            svgIcon(QStringLiteral("appearance")), QStringLiteral("MENU"));
    addPage(QStringLiteral("presets"), buildPresetsPage(), QStringLiteral("Presets"),
            svgIcon(QStringLiteral("presets")), QString());
    addPage(QStringLiteral("profiles"), buildProfilesPage(), QStringLiteral("Profiles"),
            svgIcon(QStringLiteral("profiles")), QStringLiteral("MENU"));
    addPage(QStringLiteral("backups"), buildBackupsPage(), QStringLiteral("Backups"),
            svgIcon(QStringLiteral("backups")), QStringLiteral("MENU"));
    addPage(QStringLiteral("integrations"), buildIntegrationsPage(), QStringLiteral("Integrations"),
            svgIcon(QStringLiteral("integrations")), QString());
    addPage(QStringLiteral("about"), buildAboutPage(), QStringLiteral("About"),
            svgIcon(QStringLiteral("about")), QString());
    m_navigationLayout->addStretch(1);

    connect(qApp, &QApplication::aboutToQuit, this, [this]() {
        if (m_overlay) m_overlay->hide();
    });
    auto* saveShortcut = new QShortcut(QKeySequence::Save, this);
    connect(saveShortcut, &QShortcut::activated, this, &MainWindow::saveConfig);
    auto* searchShortcut = new QShortcut(QKeySequence(QStringLiteral("/")), this);
    connect(searchShortcut, &QShortcut::activated, this, [this]() {
        QWidget* focus = QApplication::focusWidget();
        if (qobject_cast<QLineEdit*>(focus) || qobject_cast<QPlainTextEdit*>(focus)) return;
        m_navigationSearch->setFocus();
        m_navigationSearch->selectAll();
    });
}

QWidget* MainWindow::createPage(const QString& title, const QString& description, QVBoxLayout** contentLayout)
{
    auto* page = new QWidget();
    auto* pageLayout = new QVBoxLayout(page);
    pageLayout->setContentsMargins(25, 21, 25, 20);
    pageLayout->setSpacing(14);

    auto* titleBlock = new QWidget();
    auto* titleLayout = new QVBoxLayout(titleBlock);
    titleLayout->setContentsMargins(0, 0, 0, 0);
    titleLayout->setSpacing(5);
    titleLayout->addWidget(makeLabel(title, QStringLiteral("pageTitle")));
    auto* subtitle = makeLabel(description, QStringLiteral("pageDescription"));
    subtitle->setWordWrap(true);
    titleLayout->addWidget(subtitle);
    pageLayout->addWidget(titleBlock);

    auto* scroll = new QScrollArea();
    scroll->setWidgetResizable(true);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    auto* content = new QWidget();
    auto* body = new QVBoxLayout(content);
    body->setContentsMargins(0, 2, 8, 8);
    body->setSpacing(8);
    scroll->setWidget(content);
    pageLayout->addWidget(scroll, 1);
    if (contentLayout) *contentLayout = body;
    return page;
}

QWidget* MainWindow::createSettingCard(const QString& title, const QString& description, QWidget* control)
{
    auto* card = new QFrame();
    card->setObjectName(QStringLiteral("settingCard"));
    auto* layout = new QHBoxLayout(card);
    layout->setContentsMargins(14, 11, 14, 11);
    layout->setSpacing(18);
    auto* copy = new QVBoxLayout();
    copy->setSpacing(3);
    copy->addWidget(makeLabel(title));
    auto* detail = makeLabel(description, QStringLiteral("muted"));
    detail->setWordWrap(true);
    copy->addWidget(detail);
    layout->addLayout(copy, 1);
    if (control) {
        control->setParent(card);
        layout->addWidget(control, 0, Qt::AlignVCenter | Qt::AlignRight);
    }
    return card;
}

QWidget* MainWindow::createSectionHeading(const QString& title)
{
    auto* label = makeLabel(title, QStringLiteral("sectionHeading"));
    label->setContentsMargins(0, 5, 0, 5);
    return label;
}

QWidget* MainWindow::createStatCard(const QString& title, const QString& value)
{
    auto* card = new QFrame();
    card->setObjectName(QStringLiteral("statCard"));
    auto* layout = new QVBoxLayout(card);
    layout->setContentsMargins(13, 10, 13, 10);
    layout->setSpacing(4);
    auto* heading = makeLabel(title.toUpper());
    heading->setStyleSheet(QString());
    auto* valueLabel = makeLabel(value, QStringLiteral("statValue"));
    valueLabel->setStyleSheet(QString());
    layout->addWidget(heading);
    layout->addWidget(valueLabel);
    return card;
}

void MainWindow::addPage(const QString& id, QWidget* page, const QString& label, const QIcon& icon,
                         const QString& group)
{
    m_pageIndices.insert(id, m_pages->addWidget(page));
    if (group.isEmpty()) return;
    if (m_navigation.isEmpty() || m_navigation.last().group != group) {
        auto* groupLabel = makeLabel(group, QStringLiteral("navGroup"));
        m_navigationLayout->addWidget(groupLabel);
    }
    auto* button = new QPushButton(icon, label);
    button->setObjectName(QStringLiteral("navButton"));
    button->setCheckable(true);
    button->setIconSize(QSize(16, 16));
    button->setCursor(Qt::PointingHandCursor);
    button->setToolTip(label);
    connect(button, &QPushButton::clicked, this, [this, id]() { switchPage(id); });
    m_navigationLayout->addWidget(button);
    m_navigation.push_back({id, label, group, icon, button});
}

void MainWindow::switchPage(const QString& id)
{
    if (!m_pageIndices.contains(id)) return;
    m_activePage = id;
    const int pageIndex = m_pageIndices.value(id);
    m_pages->setCurrentIndex(pageIndex);
    if (QWidget* page = m_pages->widget(pageIndex)) {
        if (QScrollArea* scroll = page->findChild<QScrollArea*>()) scroll->verticalScrollBar()->setValue(0);
    }
    const bool isPrimaryPage = std::any_of(m_navigation.cbegin(), m_navigation.cend(), [&id](const NavigationEntry& item) {
        return item.id == id;
    });
    const QString selectedNavigation = isPrimaryPage ? id
        : id == QStringLiteral("fastflags") ? QStringLiteral("settings") : QStringLiteral("home");
    for (const NavigationEntry& item : m_navigation) item.button->setChecked(item.id == selectedNavigation);
    if (id == QStringLiteral("fastflags")) refreshFastFlags();
    else if (id == QStringLiteral("profiles")) refreshProfiles();
    else if (id == QStringLiteral("backups")) refreshBackups();
    else if (id == QStringLiteral("appearance")) refreshCursorStatus();
}

void MainWindow::filterNavigation(const QString& text)
{
    const QString query = text.trimmed().toLower();
    for (const NavigationEntry& item : m_navigation) {
        const bool visible = query.isEmpty() || item.label.toLower().contains(query) || item.id.contains(query);
        item.button->setVisible(visible);
    }
    for (int i = 0; i < m_navigationLayout->count(); ++i) {
        QLayoutItem* layoutItem = m_navigationLayout->itemAt(i);
        if (QWidget* widget = layoutItem->widget(); widget && widget->objectName() == QStringLiteral("navGroup")) {
            auto* groupLabel = qobject_cast<QLabel*>(widget);
            if (!groupLabel) continue;
            const QString group = groupLabel->text();
            bool anyVisible = false;
            for (const NavigationEntry& item : m_navigation) {
                if (item.group == group && item.button->isVisible()) anyVisible = true;
            }
            widget->setVisible(query.isEmpty() || anyVisible);
        }
    }
}

void MainWindow::setStatus(const QString& message, bool error)
{
    if (!m_statusLabel) return;
    m_statusLabel->setText(message);
    m_statusLabel->setStyleSheet(error ? QStringLiteral("color:#ff9292; font-size:10px;")
                                       : QStringLiteral("color:#a7b2b8; font-size:10px;"));
}

void MainWindow::appendLog(const QString& level, const QString& message)
{
    if (!m_activityLog) return;
    const QString time = QTime::currentTime().toString(QStringLiteral("HH:mm:ss"));
    m_activityLog->appendPlainText(QStringLiteral("%1  %2  %3").arg(time, level, message));
    if (m_activityLog->blockCount() > 500) {
        QTextCursor cursor(m_activityLog->document());
        cursor.movePosition(QTextCursor::Start);
        cursor.select(QTextCursor::LineUnderCursor);
        cursor.removeSelectedText();
        cursor.deleteChar();
    }
    m_activityLog->verticalScrollBar()->setValue(m_activityLog->verticalScrollBar()->maximum());
}

void MainWindow::updateStatusAndStats()
{
    if (m_configCountLabel) m_configCountLabel->setText(QString::number(fflags().size()));
    if (m_flagCountLabel) m_flagCountLabel->setText(QStringLiteral("%1 FastFlags").arg(fflags().size()));
    if (m_saveButton) m_saveButton->setEnabled(m_configLoaded && m_configDirty);
}

QJsonObject MainWindow::fflags() const
{
    return m_config.value(QStringLiteral("fflags")).toObject();
}

void MainWindow::setFlag(const QString& key, const QJsonValue& value)
{
    if (key.trimmed().isEmpty()) return;
    if (!m_configLoaded) {
        setStatus(QStringLiteral("Cannot edit FastFlags until the Sober config loads"), true);
        return;
    }
    QJsonObject current = fflags();
    current.insert(key, value);
    m_config.insert(QStringLiteral("fflags"), current);
    markConfigDirty();
}

void MainWindow::removeFlag(const QString& key)
{
    if (!m_configLoaded) {
        setStatus(QStringLiteral("Cannot edit FastFlags until the Sober config loads"), true);
        return;
    }
    QJsonObject current = fflags();
    current.remove(key);
    m_config.insert(QStringLiteral("fflags"), current);
    markConfigDirty();
}

bool MainWindow::flagAsBool(const QString& key) const
{
    return valueAsToggle(fflags().value(key));
}

void MainWindow::toggleFlag(const QString& key)
{
    const QJsonValue value = fflags().value(key);
    if (value.isBool()) setFlag(key, !value.toBool());
    else if (value.isDouble()) setFlag(key, value.toDouble() > 0 ? 0 : 1);
    else if (value.toString() == QStringLiteral("True")) setFlag(key, QStringLiteral("False"));
    else if (value.toString() == QStringLiteral("False")) setFlag(key, QStringLiteral("True"));
    else setFlag(key, true);
}

void MainWindow::markConfigDirty()
{
    if (!m_configLoaded) {
        setStatus(QStringLiteral("Cannot save: Sober config did not load"), true);
        return;
    }
    m_configDirty = true;
    setStatus(QStringLiteral("Unsaved changes"));
    updateStatusAndStats();
}

void MainWindow::saveConfig()
{
    if (!m_configLoaded) {
        setStatus(QStringLiteral("Cannot save until the Sober config loads"), true);
        return;
    }
    if (!m_configDirty) {
        setStatus(QStringLiteral("No unsaved changes"));
        return;
    }
    QString error;
    if (!m_store.saveConfig(m_config, &error)) {
        setStatus(QStringLiteral("Save failed: %1").arg(error), true);
        appendLog(QStringLiteral("ERROR"), error);
        return;
    }
    m_configDirty = false;
    setStatus(QStringLiteral("Configuration saved"));
    appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Sober configuration saved"));
    updateStatusAndStats();
}

bool MainWindow::persistTunerConfig(const QString& successMessage)
{
    if (!m_tunerLoaded) {
        setStatus(QStringLiteral("Tuner settings are read-only until the file is repaired"), true);
        return false;
    }
    QString error;
    if (!m_store.saveTunerConfig(m_tunerConfig, &error)) {
        setStatus(QStringLiteral("Could not save tuner settings: %1").arg(error), true);
        appendLog(QStringLiteral("ERROR"), error);
        return false;
    }
    if (!successMessage.isEmpty()) setStatus(successMessage);
    return true;
}

void MainWindow::showHelpMessage(const QString& title, const QString& message)
{
    QMessageBox::information(this, title, message);
}

QWidget* MainWindow::buildHomePage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Main Menu"),
        QStringLiteral("Start Sober, jump to common tools, and check recent activity."), &content);

    auto* stats = new QHBoxLayout();
    auto* statusCard = createStatCard(QStringLiteral("Client status"), m_configLoaded ? QStringLiteral("Ready") : QStringLiteral("Config unavailable"));
    auto* flagsCard = createStatCard(QStringLiteral("Active FastFlags"), QString::number(fflags().size()));
    auto* versionCard = createStatCard(QStringLiteral("Sober"), QStringLiteral("Flatpak"));
    m_configCountLabel = flagsCard->findChild<QLabel*>(QStringLiteral("statValue"));
    stats->addWidget(statusCard, 1);
    stats->addWidget(flagsCard, 1);
    stats->addWidget(versionCard, 1);
    content->addLayout(stats);

    auto* launchCard = new QFrame();
    launchCard->setObjectName(QStringLiteral("settingCard"));
    auto* launchLayout = new QHBoxLayout(launchCard);
    launchLayout->setContentsMargins(13, 10, 13, 10);
    auto* launchCopy = new QVBoxLayout();
    launchCopy->setSpacing(3);
    launchCopy->addWidget(makeLabel(QStringLiteral("Start Sober")));
    auto* launchDescription = makeLabel(QStringLiteral("Launch Roblox using the saved Sober configuration."), QStringLiteral("muted"));
    launchDescription->setWordWrap(true);
    launchCopy->addWidget(launchDescription);
    launchLayout->addLayout(launchCopy, 1);
    auto* launchActions = new QHBoxLayout();
    m_launchButton = new QPushButton(QStringLiteral("Start Sober"));
    m_launchButton->setObjectName(QStringLiteral("primaryButton"));
    m_launchButton->setIcon(svgIcon(QStringLiteral("play")));
    m_launchButton->setIconSize(QSize(15, 15));
    connect(m_launchButton, &QPushButton::clicked, this, &MainWindow::startSober);
    auto* openConfigButton = new QPushButton(QStringLiteral("Open config folder"));
    openConfigButton->setObjectName(QStringLiteral("secondaryButton"));
    openConfigButton->setIcon(svgIcon(QStringLiteral("folder")));
    openConfigButton->setIconSize(QSize(15, 15));
    connect(openConfigButton, &QPushButton::clicked, this, [this]() {
        QDesktopServices::openUrl(QUrl::fromLocalFile(QFileInfo(m_store.configPath()).absolutePath()));
    });
    launchActions->addWidget(m_launchButton);
    launchActions->addWidget(openConfigButton);
    launchLayout->addLayout(launchActions);
    content->addWidget(launchCard);

    content->addWidget(createSectionHeading(QStringLiteral("Fast access")));
    auto* shortcuts = new QGridLayout();
    shortcuts->setContentsMargins(0, 0, 0, 0);
    shortcuts->setHorizontalSpacing(7);
    shortcuts->setVerticalSpacing(7);
    const struct ShortcutEntry { QString title; QString page; QString icon; } entries[] = {
        {QStringLiteral("Settings"), QStringLiteral("settings"), QStringLiteral("settings")},
        {QStringLiteral("Fast Flags"), QStringLiteral("fastflags"), QStringLiteral("flags")},
        {QStringLiteral("Presets"), QStringLiteral("presets"), QStringLiteral("presets")},
        {QStringLiteral("Profiles"), QStringLiteral("profiles"), QStringLiteral("profiles")},
        {QStringLiteral("Appearance"), QStringLiteral("appearance"), QStringLiteral("appearance")},
        {QStringLiteral("Backups"), QStringLiteral("backups"), QStringLiteral("backups")},
        {QStringLiteral("Integrations"), QStringLiteral("integrations"), QStringLiteral("integrations")},
        {QStringLiteral("About"), QStringLiteral("about"), QStringLiteral("about")}
    };
    for (int i = 0; i < static_cast<int>(std::size(entries)); ++i) {
        const auto& entry = entries[i];
        auto* shortcut = new QPushButton(svgIcon(entry.icon), entry.title);
        shortcut->setObjectName(QStringLiteral("secondaryButton"));
        shortcut->setIconSize(QSize(16, 16));
        shortcut->setMinimumHeight(36);
        connect(shortcut, &QPushButton::clicked, this, [this, target = entry.page]() { switchPage(target); });
        shortcuts->addWidget(shortcut, i / 4, i % 4);
    }
    content->addLayout(shortcuts);

    content->addWidget(createSectionHeading(QStringLiteral("Quick toggles")));
    auto* quickToggles = new QGridLayout();
    quickToggles->setContentsMargins(0, 0, 0, 0);
    quickToggles->setHorizontalSpacing(7);
    quickToggles->setVerticalSpacing(6);
    const QList<QPair<QString, QStringList>> quickFlags = {
        {QStringLiteral("FFlagDisablePostFx"), {QStringLiteral("Disable PostFX"), QStringLiteral("Turn off post-processing effects.")}},
        {QStringLiteral("FFlagDisableGlobalShadows"), {QStringLiteral("Disable shadows"), QStringLiteral("Turn off global shadows.")}},
        {QStringLiteral("FFlagDebugDisplayFPS"), {QStringLiteral("Show FPS counter"), QStringLiteral("Display in-game frame rate.")}},
        {QStringLiteral("FFlagDebugGraphicsPreferVulkan"), {QStringLiteral("Prefer Vulkan"), QStringLiteral("Use Vulkan as the preferred renderer.")}}
    };
    for (int i = 0; i < quickFlags.size(); ++i) {
        const auto& flag = quickFlags.at(i);
        auto* toggle = new ToggleSwitch();
        toggle->setChecked(flagAsBool(flag.first));
        toggle->setAccessibleName(flag.second.at(0));
        connect(toggle, &QAbstractButton::toggled, this, [this, key = flag.first](bool enabled) {
            setFlag(key, enabled);
        });
        quickToggles->addWidget(createSettingCard(flag.second.at(0), flag.second.at(1), toggle), i / 2, i % 2);
    }
    content->addLayout(quickToggles);

    auto* logHeading = new QHBoxLayout();
    logHeading->addWidget(createSectionHeading(QStringLiteral("Activity log")), 1);
    auto* clearLog = new QPushButton(QStringLiteral("Clear"));
    clearLog->setObjectName(QStringLiteral("secondaryButton"));
    clearLog->setFixedWidth(68);
    logHeading->addWidget(clearLog, 0, Qt::AlignBottom);
    content->addLayout(logHeading);
    m_activityLog = new QPlainTextEdit();
    m_activityLog->setReadOnly(true);
    m_activityLog->setPlaceholderText(QStringLiteral("Activity from SoberTrap and the Sober launcher will appear here."));
    m_activityLog->setMinimumHeight(150);
    m_activityLog->setMaximumHeight(220);
    m_activityLog->setMaximumBlockCount(500);
    connect(clearLog, &QPushButton::clicked, m_activityLog, &QPlainTextEdit::clear);
    content->addWidget(m_activityLog);
    content->addStretch();
    return page;
}

QWidget* MainWindow::buildSettingsPage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Settings"),
        QStringLiteral("Configure the Roblox renderer, launch channel, and common client tweaks."), &content);

    content->addWidget(createSectionHeading(QStringLiteral("Fast Flag management")));
    auto* openFlagsButton = new QPushButton(QStringLiteral("Open Fast Flags"));
    openFlagsButton->setObjectName(QStringLiteral("secondaryButton"));
    connect(openFlagsButton, &QPushButton::clicked, this, [this]() { switchPage(QStringLiteral("fastflags")); });
    content->addWidget(createSettingCard(QStringLiteral("Fast Flags"),
        QStringLiteral("Search, add, and edit overrides in your Sober configuration."), openFlagsButton));

    content->addWidget(createSectionHeading(QStringLiteral("Graphics and launch")));
    auto* renderer = new QComboBox();
    renderer->addItems({QStringLiteral("OpenGL"), QStringLiteral("Vulkan")});
    renderer->setCurrentText(flagAsBool(QStringLiteral("FFlagDebugGraphicsPreferVulkan"))
                             ? QStringLiteral("Vulkan") : QStringLiteral("OpenGL"));
    connect(renderer, &QComboBox::currentTextChanged, this, [this](const QString& value) {
        setFlag(QStringLiteral("FFlagDebugGraphicsPreferVulkan"), value == QStringLiteral("Vulkan"));
    });
    content->addWidget(createSettingCard(QStringLiteral("Renderer"), QStringLiteral("Graphics API preferred by the Roblox client."), renderer));

    auto* fps = new QComboBox();
    fps->addItems({QStringLiteral("30"), QStringLiteral("60"), QStringLiteral("75"), QStringLiteral("120"),
                   QStringLiteral("144"), QStringLiteral("165"), QStringLiteral("240"), QStringLiteral("0")});
    const QString fpsCurrent = QString::number(fflags().value(QStringLiteral("DFIntTaskSchedulerTargetFps")).toInt(60));
    if (fps->findText(fpsCurrent) < 0) fps->addItem(fpsCurrent);
    fps->setCurrentText(fpsCurrent);
    connect(fps, &QComboBox::currentTextChanged, this, [this](const QString& value) {
        bool ok = false;
        const int number = value.toInt(&ok);
        if (ok) setFlag(QStringLiteral("DFIntTaskSchedulerTargetFps"), number);
    });
    content->addWidget(createSettingCard(QStringLiteral("FPS cap"), QStringLiteral("Target framerate (0 means unlimited)."), fps));

    auto* channel = new QComboBox();
    channel->addItems({QStringLiteral("LIVE"), QStringLiteral("ZINTEGRATION"), QStringLiteral("ZCANARY"), QStringLiteral("ZWINCANARY")});
    QString channelCurrent = fflags().value(QStringLiteral("FFlagDebugReleaseChannelOverride")).toString(QStringLiteral("LIVE"));
    if (channelCurrent.isEmpty()) channelCurrent = QStringLiteral("LIVE");
    if (channel->findText(channelCurrent) < 0) channel->addItem(channelCurrent);
    channel->setCurrentText(channelCurrent);
    connect(channel, &QComboBox::currentTextChanged, this, [this](const QString& value) {
        setFlag(QStringLiteral("FFlagDebugReleaseChannelOverride"), value);
    });
    content->addWidget(createSettingCard(QStringLiteral("Release channel"), QStringLiteral("LIVE is the stable client channel."), channel));

    content->addWidget(createSectionHeading(QStringLiteral("Tweak settings")));
    const QList<QPair<QString, QStringList>> tweaks = {
        {QStringLiteral("FFlagDisablePostFx"), {QStringLiteral("Disable PostFX"), QStringLiteral("Turn off post-processing effects.")}},
        {QStringLiteral("FFlagDisableBloom"), {QStringLiteral("Disable bloom"), QStringLiteral("Remove bloom glow from bright objects.")}},
        {QStringLiteral("FFlagDisableDepthOfField"), {QStringLiteral("Disable depth of field"), QStringLiteral("Remove camera depth-of-field blur.")}},
        {QStringLiteral("FFlagDisableGlobalShadows"), {QStringLiteral("Disable global shadows"), QStringLiteral("Reduce rendering work by turning off shadows.")}},
        {QStringLiteral("FFlagDebugDisplayFPS"), {QStringLiteral("Show FPS counter"), QStringLiteral("Display the frame rate while playing.")}},
        {QStringLiteral("DFFlagDebugPauseVoxelizer"), {QStringLiteral("Pause voxelizer"), QStringLiteral("Freeze CSG voxelization; this may affect visuals.")}},
        {QStringLiteral("FFlagEnableReducedLatency"), {QStringLiteral("Reduced latency"), QStringLiteral("Request lower input latency from the client.")}},
        {QStringLiteral("DFFlagTextureQualityOverrideEnabled"), {QStringLiteral("Override texture quality"), QStringLiteral("Use the texture quality value in Fast Flags.")}},
        {QStringLiteral("FFlagDebugSkyGray"), {QStringLiteral("Gray skybox"), QStringLiteral("Replace the default sky color with gray.")}}
    };
    for (const auto& tweak : tweaks) {
        auto* toggle = new ToggleSwitch();
        toggle->setChecked(flagAsBool(tweak.first));
        toggle->setAccessibleName(tweak.second.at(0));
        connect(toggle, &QAbstractButton::toggled, this, [this, key = tweak.first](bool enabled) {
            setFlag(key, enabled);
        });
        content->addWidget(createSettingCard(tweak.second.at(0), tweak.second.at(1), toggle));
    }

    auto* note = makeLabel(QStringLiteral("Changes are staged until you press Save changes. Restart Sober for them to take effect."), QStringLiteral("muted"));
    note->setWordWrap(true);
    note->setContentsMargins(4, 8, 4, 4);
    content->addWidget(note);
    content->addStretch();
    return page;
}

QWidget* MainWindow::buildFastFlagsPage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Fast Flags"),
        QStringLiteral("Search, add, and edit the FastFlags in your Sober configuration."), &content);

    auto* backToSettings = new QPushButton(QStringLiteral("←  Back to Settings"));
    backToSettings->setObjectName(QStringLiteral("secondaryButton"));
    backToSettings->setSizePolicy(QSizePolicy::Maximum, QSizePolicy::Fixed);
    connect(backToSettings, &QPushButton::clicked, this, [this]() { switchPage(QStringLiteral("settings")); });
    content->addWidget(backToSettings);

    auto* toolbar = new QHBoxLayout();
    m_flagSearch = new QLineEdit();
    m_flagSearch->setPlaceholderText(QStringLiteral("Search flags…"));
    m_flagSearch->setClearButtonEnabled(true);
    toolbar->addWidget(m_flagSearch, 1);
    auto* addButton = new QPushButton(QStringLiteral("＋  Add flag"));
    addButton->setObjectName(QStringLiteral("primaryButton"));
    toolbar->addWidget(addButton);
    content->addLayout(toolbar);
    connect(m_flagSearch, &QLineEdit::textChanged, this, &MainWindow::refreshFastFlags);
    connect(addButton, &QPushButton::clicked, this, [this]() {
        QDialog dialog(this);
        dialog.setWindowTitle(QStringLiteral("Add FastFlag"));
        dialog.setMinimumWidth(420);
        auto* layout = new QVBoxLayout(&dialog);
        auto* form = new QFormLayout();
        auto* name = new QLineEdit();
        name->setPlaceholderText(QStringLiteral("Example: FFlagDebugDisplayFPS"));
        auto* type = new QComboBox();
        type->addItems({QStringLiteral("Boolean"), QStringLiteral("Number"), QStringLiteral("String")});
        auto* value = new QLineEdit(QStringLiteral("true"));
        form->addRow(QStringLiteral("Flag name"), name);
        form->addRow(QStringLiteral("Type"), type);
        form->addRow(QStringLiteral("Value"), value);
        layout->addLayout(form);
        auto* buttons = new QDialogButtonBox(QDialogButtonBox::Save | QDialogButtonBox::Cancel);
        layout->addWidget(buttons);
        connect(type, &QComboBox::currentTextChanged, &dialog, [value](const QString& current) {
            if (current == QStringLiteral("Number")) {
                value->setText(QStringLiteral("0"));
                value->setPlaceholderText(QStringLiteral("0"));
            } else if (current == QStringLiteral("Boolean")) {
                value->setText(QStringLiteral("true"));
                value->setPlaceholderText(QStringLiteral("true or false"));
            } else {
                value->clear();
                value->setPlaceholderText(QStringLiteral("Value"));
            }
        });
        connect(buttons, &QDialogButtonBox::rejected, &dialog, &QDialog::reject);
        connect(buttons, &QDialogButtonBox::accepted, &dialog, [&dialog]() { dialog.accept(); });
        if (dialog.exec() != QDialog::Accepted) return;

        const QString key = name->text().trimmed();
        if (key.isEmpty()) {
            QMessageBox::warning(this, QStringLiteral("FastFlag required"), QStringLiteral("Enter a flag name."));
            return;
        }
        QJsonObject current = fflags();
        if (current.contains(key) && QMessageBox::question(this, QStringLiteral("Replace FastFlag?"),
            QStringLiteral("%1 already exists. Replace it?").arg(key)) != QMessageBox::Yes) return;
        QJsonValue parsed;
        if (type->currentText() == QStringLiteral("Boolean")) {
            const QString boolText = value->text().trimmed().toLower();
            if (boolText != QStringLiteral("true") && boolText != QStringLiteral("false")) {
                QMessageBox::warning(this, QStringLiteral("Invalid boolean"), QStringLiteral("Enter true or false."));
                return;
            }
            parsed = boolText == QStringLiteral("true");
        } else if (type->currentText() == QStringLiteral("Number")) {
            bool ok = false;
            const double number = QLocale::c().toDouble(value->text(), &ok);
            if (!ok) {
                QMessageBox::warning(this, QStringLiteral("Invalid number"), QStringLiteral("Enter a valid numeric value."));
                return;
            }
            parsed = number;
        } else {
            parsed = value->text();
        }
        setFlag(key, parsed);
        refreshFastFlags();
    });

    m_flagCountLabel = makeLabel(QStringLiteral("0 FastFlags"), QStringLiteral("muted"));
    content->addWidget(m_flagCountLabel);
    m_flagTable = new QTableWidget();
    m_flagTable->setColumnCount(4);
    m_flagTable->setHorizontalHeaderLabels({QStringLiteral("FLAG NAME"), QStringLiteral("TYPE"), QStringLiteral("VALUE"), QString()});
    m_flagTable->horizontalHeader()->setSectionResizeMode(0, QHeaderView::Stretch);
    m_flagTable->horizontalHeader()->setSectionResizeMode(1, QHeaderView::ResizeToContents);
    m_flagTable->horizontalHeader()->setSectionResizeMode(2, QHeaderView::ResizeToContents);
    m_flagTable->horizontalHeader()->setSectionResizeMode(3, QHeaderView::Fixed);
    m_flagTable->setColumnWidth(3, 48);
    m_flagTable->verticalHeader()->setVisible(false);
    m_flagTable->setSelectionMode(QAbstractItemView::NoSelection);
    m_flagTable->setEditTriggers(QAbstractItemView::NoEditTriggers);
    m_flagTable->setShowGrid(false);
    m_flagTable->setAlternatingRowColors(false);
    content->addWidget(m_flagTable, 1);
    refreshFastFlags();
    return page;
}

void MainWindow::refreshFastFlags()
{
    if (!m_flagTable) return;
    const QString query = m_flagSearch ? m_flagSearch->text().trimmed().toLower() : QString();
    const QJsonObject flags = fflags();
    QStringList keys = flags.keys();
    std::sort(keys.begin(), keys.end(), [](const QString& left, const QString& right) {
        return QString::compare(left, right, Qt::CaseInsensitive) < 0;
    });
    m_flagTable->setRowCount(0);
    int shown = 0;
    for (const QString& key : keys) {
        if (!key.toLower().contains(query)) continue;
        const QJsonValue value = flags.value(key);
        const int row = m_flagTable->rowCount();
        m_flagTable->insertRow(row);
        m_flagTable->setRowHeight(row, 42);
        auto* nameItem = new QTableWidgetItem(key);
        nameItem->setFlags(nameItem->flags() & ~Qt::ItemIsEditable);
        m_flagTable->setItem(row, 0, nameItem);
        auto* typeItem = new QTableWidgetItem(valueTypeName(value));
        typeItem->setForeground(value.isBool() ? QColor(kAccent) : value.isDouble() ? QColor(QStringLiteral("#e5c07b")) : QColor(QStringLiteral("#9dd4a8")));
        typeItem->setFlags(typeItem->flags() & ~Qt::ItemIsEditable);
        m_flagTable->setItem(row, 1, typeItem);

        if (valueIsToggle(value) || value.isDouble()) {
            auto* cell = new QWidget();
            auto* cellLayout = new QHBoxLayout(cell);
            cellLayout->setContentsMargins(7, 0, 7, 0);
            cellLayout->setAlignment(Qt::AlignLeft | Qt::AlignVCenter);
            if (valueIsToggle(value)) {
                auto* toggle = new ToggleSwitch();
                toggle->setChecked(valueAsToggle(value));
                toggle->setAccessibleName(QStringLiteral("Toggle %1").arg(key));
                connect(toggle, &QAbstractButton::toggled, this, [this, key, value](bool checked) {
                    if (value.isBool()) setFlag(key, checked);
                    else setFlag(key, checked ? QStringLiteral("True") : QStringLiteral("False"));
                });
                cellLayout->addWidget(toggle);
                auto* valueLabel = makeLabel(valueDisplay(value), QStringLiteral("muted"));
                cellLayout->addWidget(valueLabel);
                connect(toggle, &QAbstractButton::toggled, valueLabel, [valueLabel, value](bool checked) {
                    if (value.isBool()) valueLabel->setText(checked ? QStringLiteral("true") : QStringLiteral("false"));
                    else valueLabel->setText(checked ? QStringLiteral("True") : QStringLiteral("False"));
                });
            } else {
                auto* editor = new QLineEdit(valueDisplay(value));
                editor->setMaximumWidth(180);
                editor->setToolTip(QStringLiteral("Edit numeric value"));
                connect(editor, &QLineEdit::editingFinished, this, [this, key, editor]() {
                    bool ok = false;
                    const double number = QLocale::c().toDouble(editor->text(), &ok);
                    if (!ok) {
                        editor->setStyleSheet(QStringLiteral("border:1px solid #d66;"));
                        return;
                    }
                    editor->setStyleSheet(QString());
                    setFlag(key, number);
                });
                cellLayout->addWidget(editor);
            }
            cellLayout->addStretch();
            m_flagTable->setCellWidget(row, 2, cell);
        } else {
            auto* editor = new QLineEdit(valueDisplay(value));
            editor->setMaximumWidth(220);
            editor->setToolTip(QStringLiteral("Edit string value"));
            connect(editor, &QLineEdit::editingFinished, this, [this, key, editor]() {
                editor->setStyleSheet(QString());
                setFlag(key, editor->text());
            });
            m_flagTable->setCellWidget(row, 2, editor);
        }

        auto* remove = new QPushButton(QStringLiteral("×"));
        remove->setObjectName(QStringLiteral("dangerButton"));
        remove->setFixedSize(28, 27);
        remove->setToolTip(QStringLiteral("Remove %1").arg(key));
        connect(remove, &QPushButton::clicked, this, [this, key]() {
            if (QMessageBox::question(this, QStringLiteral("Remove FastFlag"),
                QStringLiteral("Remove %1 from the configuration?").arg(key)) == QMessageBox::Yes) {
                removeFlag(key);
                refreshFastFlags();
            }
        });
        m_flagTable->setCellWidget(row, 3, remove);
        ++shown;
    }
    if (m_flagCountLabel) {
        m_flagCountLabel->setText(query.isEmpty()
            ? QStringLiteral("%1 FastFlags").arg(flags.size())
            : QStringLiteral("Showing %1 of %2 FastFlags").arg(shown).arg(flags.size()));
    }
    updateStatusAndStats();
}

QWidget* MainWindow::buildPresetsPage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Mods and presets"),
        QStringLiteral("Apply a predefined FastFlag configuration. Applying a preset replaces the current FastFlags."), &content);
    auto* warning = makeLabel(QStringLiteral("Back up your config before replacing existing FastFlags."));
    warning->setWordWrap(true);
    warning->setStyleSheet(QString());
    content->addWidget(warning);
    content->addWidget(createSectionHeading(QStringLiteral("Available presets")));

    const struct PresetDescription { QString title; QString detail; QString action; QJsonObject flags; bool clear; } presets[] = {
        {QStringLiteral("Max Performance"), QStringLiteral("Prioritize frame rate by reducing visual effects, texture quality, and render detail."), QStringLiteral("Apply preset"), makePerformancePreset(), false},
        {QStringLiteral("Balanced"), QStringLiteral("A lighter set of rendering overrides while leaving more visual effects enabled."), QStringLiteral("Apply preset"), makeBalancedPreset(), false},
        {QStringLiteral("Clear all flags"), QStringLiteral("Remove every custom FastFlag from the current Sober configuration."), QStringLiteral("Clear flags"), {}, true}
    };
    for (const auto& preset : presets) {
        auto* control = new QPushButton(preset.action);
        control->setObjectName(preset.clear ? QStringLiteral("dangerButton") : QStringLiteral("secondaryButton"));
        connect(control, &QPushButton::clicked, this, [this, preset]() {
            if (preset.clear) clearFlags();
            else applyPreset(preset.title, preset.flags);
        });
        content->addWidget(createSettingCard(preset.title, preset.detail, control));
    }
    content->addStretch();
    return page;
}

void MainWindow::applyPreset(const QString& name, const QJsonObject& preset)
{
    if (!m_configLoaded) {
        setStatus(QStringLiteral("Cannot apply a preset until the Sober config loads"), true);
        return;
    }
    if (QMessageBox::question(this, QStringLiteral("Apply preset"),
        QStringLiteral("Apply '%1'? This replaces all %2 current FastFlags.").arg(name).arg(fflags().size()),
        QMessageBox::Apply | QMessageBox::Cancel, QMessageBox::Cancel) != QMessageBox::Apply) return;
    m_config.insert(QStringLiteral("fflags"), preset);
    markConfigDirty();
    refreshFastFlags();
    appendLog(QStringLiteral("INFO"), QStringLiteral("Preset '%1' staged (%2 flags)").arg(name).arg(preset.size()));
}

void MainWindow::clearFlags()
{
    if (!m_configLoaded) {
        setStatus(QStringLiteral("Cannot clear FastFlags until the Sober config loads"), true);
        return;
    }
    if (QMessageBox::question(this, QStringLiteral("Clear all FastFlags"),
        QStringLiteral("Remove all %1 custom FastFlags from the current config?").arg(fflags().size()),
        QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel) != QMessageBox::Yes) return;
    m_config.insert(QStringLiteral("fflags"), QJsonObject());
    markConfigDirty();
    refreshFastFlags();
}

QWidget* MainWindow::buildProfilesPage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Profiles"),
        QStringLiteral("Save sets of FastFlags for different games or play styles."), &content);
    auto* actions = new QHBoxLayout();
    auto* emptyButton = new QPushButton(QStringLiteral("New empty profile"));
    emptyButton->setObjectName(QStringLiteral("secondaryButton"));
    auto* currentButton = new QPushButton(QStringLiteral("Save current flags"));
    currentButton->setObjectName(QStringLiteral("primaryButton"));
    auto* refreshButton = new QPushButton(QStringLiteral("Refresh"));
    refreshButton->setObjectName(QStringLiteral("secondaryButton"));
    actions->addWidget(emptyButton);
    actions->addWidget(currentButton);
    actions->addStretch();
    actions->addWidget(refreshButton);
    content->addLayout(actions);
    connect(emptyButton, &QPushButton::clicked, this, [this]() { createProfile(false); });
    connect(currentButton, &QPushButton::clicked, this, [this]() { createProfile(true); });
    connect(refreshButton, &QPushButton::clicked, this, &MainWindow::refreshProfiles);

    content->addWidget(createSectionHeading(QStringLiteral("Saved profiles")));
    auto* listHost = new QWidget();
    m_profilesListLayout = new QVBoxLayout(listHost);
    m_profilesListLayout->setContentsMargins(0, 0, 0, 0);
    m_profilesListLayout->setSpacing(7);
    content->addWidget(listHost);
    content->addStretch();
    refreshProfiles();
    return page;
}

void MainWindow::refreshProfiles()
{
    if (!m_profilesListLayout) return;
    clearLayout(m_profilesListLayout);
    if (!m_tunerLoaded) {
        auto* error = makeLabel(QStringLiteral("Tuner settings could not be read. Profiles are disabled to protect existing data."), QStringLiteral("muted"));
        error->setWordWrap(true);
        m_profilesListLayout->addWidget(error);
        return;
    }
    const QJsonArray profiles = m_tunerConfig.value(QStringLiteral("profiles")).toArray();
    if (profiles.isEmpty()) {
        auto* empty = makeLabel(QStringLiteral("No profiles yet. Save your current flags to create one."), QStringLiteral("muted"));
        empty->setAlignment(Qt::AlignCenter);
        empty->setMinimumHeight(75);
        m_profilesListLayout->addWidget(empty);
        return;
    }
    for (const QJsonValue& value : profiles) {
        const QJsonObject profile = value.toObject();
        const QString id = profile.value(QStringLiteral("id")).toString();
        const QString name = profile.value(QStringLiteral("name")).toString(QStringLiteral("Untitled profile"));
        const QString gameName = profile.value(QStringLiteral("gameName")).toString();
        const int count = profile.value(QStringLiteral("fflags")).toObject().size();
        const qint64 updated = profile.value(QStringLiteral("updatedAt")).toVariant().toLongLong();

        auto* card = new QFrame();
        card->setObjectName(QStringLiteral("settingCard"));
        auto* row = new QHBoxLayout(card);
        row->setContentsMargins(13, 11, 13, 11);
        row->setSpacing(10);
        auto* copy = new QVBoxLayout();
        copy->setSpacing(4);
        copy->addWidget(makeLabel(name));
        QString detail = QStringLiteral("%1 flags").arg(count);
        if (!gameName.isEmpty()) detail += QStringLiteral(" · %1").arg(gameName);
        if (updated > 0) detail += QStringLiteral(" · Updated %1").arg(QDateTime::fromMSecsSinceEpoch(updated).toString(QStringLiteral("MMM d, HH:mm")));
        copy->addWidget(makeLabel(detail, QStringLiteral("muted")));
        row->addLayout(copy, 1);

        auto* apply = new QPushButton(QStringLiteral("Apply"));
        apply->setObjectName(QStringLiteral("primaryButton"));
        auto* update = new QPushButton(QStringLiteral("Update"));
        update->setObjectName(QStringLiteral("secondaryButton"));
        auto* rename = new QPushButton(QStringLiteral("Rename"));
        rename->setObjectName(QStringLiteral("secondaryButton"));
        auto* remove = new QPushButton(QStringLiteral("Delete"));
        remove->setObjectName(QStringLiteral("dangerButton"));
        connect(apply, &QPushButton::clicked, this, [this, id]() { applyProfile(id); });
        connect(update, &QPushButton::clicked, this, [this, id]() { updateProfile(id); });
        connect(rename, &QPushButton::clicked, this, [this, id]() { renameProfile(id); });
        connect(remove, &QPushButton::clicked, this, [this, id]() { deleteProfile(id); });
        row->addWidget(apply);
        row->addWidget(update);
        row->addWidget(rename);
        row->addWidget(remove);
        m_profilesListLayout->addWidget(card);
    }
}

void MainWindow::createProfile(bool fromCurrent)
{
    if (!m_tunerLoaded) {
        setStatus(QStringLiteral("Profiles are disabled because tuner.json could not be loaded"), true);
        return;
    }
    bool accepted = false;
    const QString name = QInputDialog::getText(this, QStringLiteral("Create profile"),
        QStringLiteral("Profile name:"), QLineEdit::Normal,
        fromCurrent ? QString() : QStringLiteral("New Profile"), &accepted).trimmed();
    if (!accepted || name.isEmpty()) return;
    const QString gameName = fromCurrent
        ? QInputDialog::getText(this, QStringLiteral("Game name"),
            QStringLiteral("Optional game name:"), QLineEdit::Normal, QString(), &accepted).trimmed()
        : QString();
    if (fromCurrent && !accepted) return;

    QJsonObject profile;
    profile.insert(QStringLiteral("id"), QUuid::createUuid().toString(QUuid::WithoutBraces));
    profile.insert(QStringLiteral("name"), name);
    if (!gameName.isEmpty()) profile.insert(QStringLiteral("gameName"), gameName);
    profile.insert(QStringLiteral("fflags"), fromCurrent ? fflags() : QJsonObject());
    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    profile.insert(QStringLiteral("createdAt"), static_cast<double>(now));
    profile.insert(QStringLiteral("updatedAt"), static_cast<double>(now));
    QJsonArray profiles = m_tunerConfig.value(QStringLiteral("profiles")).toArray();
    profiles.append(profile);
    m_tunerConfig.insert(QStringLiteral("profiles"), profiles);
    if (persistTunerConfig(QStringLiteral("Profile created"))) {
        appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Profile '%1' created").arg(name));
        refreshProfiles();
    }
}

void MainWindow::updateProfile(const QString& id)
{
    QJsonArray profiles = m_tunerConfig.value(QStringLiteral("profiles")).toArray();
    bool found = false;
    for (qsizetype i = 0; i < profiles.size(); ++i) {
        QJsonObject profile = profiles.at(i).toObject();
        if (profile.value(QStringLiteral("id")).toString() != id) continue;
        profile.insert(QStringLiteral("fflags"), fflags());
        profile.insert(QStringLiteral("updatedAt"), static_cast<double>(QDateTime::currentMSecsSinceEpoch()));
        profiles.replace(i, profile);
        found = true;
        break;
    }
    if (!found) return;
    m_tunerConfig.insert(QStringLiteral("profiles"), profiles);
    if (persistTunerConfig(QStringLiteral("Profile updated with current flags"))) refreshProfiles();
}

void MainWindow::applyProfile(const QString& id)
{
    if (!m_configLoaded) {
        setStatus(QStringLiteral("Cannot apply a profile until the Sober config loads"), true);
        return;
    }
    const QJsonArray profiles = m_tunerConfig.value(QStringLiteral("profiles")).toArray();
    for (const QJsonValue& value : profiles) {
        const QJsonObject profile = value.toObject();
        if (profile.value(QStringLiteral("id")).toString() != id) continue;
        QJsonArray updatedProfiles = profiles;
        QJsonObject updatedProfile = profile;
        updatedProfile.insert(QStringLiteral("updatedAt"), static_cast<double>(QDateTime::currentMSecsSinceEpoch()));
        for (qsizetype i = 0; i < updatedProfiles.size(); ++i) {
            if (updatedProfiles.at(i).toObject().value(QStringLiteral("id")).toString() == id) {
                updatedProfiles.replace(i, updatedProfile);
                break;
            }
        }
        m_tunerConfig.insert(QStringLiteral("profiles"), updatedProfiles);
        persistTunerConfig();
        m_config.insert(QStringLiteral("fflags"), profile.value(QStringLiteral("fflags")).toObject());
        markConfigDirty();
        refreshFastFlags();
        appendLog(QStringLiteral("INFO"), QStringLiteral("Profile '%1' staged; save to apply")
                  .arg(profile.value(QStringLiteral("name")).toString()));
        return;
    }
}

void MainWindow::renameProfile(const QString& id)
{
    QJsonArray profiles = m_tunerConfig.value(QStringLiteral("profiles")).toArray();
    for (qsizetype i = 0; i < profiles.size(); ++i) {
        QJsonObject profile = profiles.at(i).toObject();
        if (profile.value(QStringLiteral("id")).toString() != id) continue;
        bool accepted = false;
        const QString name = QInputDialog::getText(this, QStringLiteral("Rename profile"),
            QStringLiteral("Profile name:"), QLineEdit::Normal,
            profile.value(QStringLiteral("name")).toString(), &accepted).trimmed();
        if (!accepted || name.isEmpty()) return;
        profile.insert(QStringLiteral("name"), name);
        profile.insert(QStringLiteral("updatedAt"), static_cast<double>(QDateTime::currentMSecsSinceEpoch()));
        profiles.replace(i, profile);
        m_tunerConfig.insert(QStringLiteral("profiles"), profiles);
        if (persistTunerConfig(QStringLiteral("Profile renamed"))) refreshProfiles();
        return;
    }
}

void MainWindow::deleteProfile(const QString& id)
{
    if (QMessageBox::question(this, QStringLiteral("Delete profile"),
        QStringLiteral("Delete this saved profile?"), QMessageBox::Yes | QMessageBox::Cancel,
        QMessageBox::Cancel) != QMessageBox::Yes) return;
    QJsonArray filtered;
    for (const QJsonValue& value : m_tunerConfig.value(QStringLiteral("profiles")).toArray()) {
        if (value.toObject().value(QStringLiteral("id")).toString() != id) filtered.append(value);
    }
    m_tunerConfig.insert(QStringLiteral("profiles"), filtered);
    if (persistTunerConfig(QStringLiteral("Profile deleted"))) refreshProfiles();
}

QWidget* MainWindow::buildAppearancePage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Appearance"),
        QStringLiteral("Customize a click-through crosshair overlay, the shift-lock cursor, and skybox asset references."), &content);

    content->addWidget(createSectionHeading(QStringLiteral("Crosshair overlay")));
    auto* crosshairCard = new QFrame();
    crosshairCard->setObjectName(QStringLiteral("settingCard"));
    auto* crosshairLayout = new QHBoxLayout(crosshairCard);
    crosshairLayout->setContentsMargins(14, 14, 14, 14);
    crosshairLayout->setSpacing(18);
    m_crosshairPreview = new QLabel();
    m_crosshairPreview->setFixedSize(104, 82);
    m_crosshairPreview->setAlignment(Qt::AlignCenter);
    m_crosshairPreview->setStyleSheet(QStringLiteral("background:#1e1e1e; border:1px dashed #4a4a4a; border-radius:4px;"));
    crosshairLayout->addWidget(m_crosshairPreview);

    auto* controls = new QVBoxLayout();
    controls->setSpacing(8);
    auto* styleRow = new QHBoxLayout();
    styleRow->addWidget(makeLabel(QStringLiteral("Style"), QStringLiteral("muted")));
    m_crosshairType = new QComboBox();
    m_crosshairType->addItems({QStringLiteral("Dot"), QStringLiteral("Cross"), QStringLiteral("Circle"), QStringLiteral("Crosshair"), QStringLiteral("Plus")});
    const QJsonObject crosshair = m_tunerConfig.value(QStringLiteral("crosshair")).toObject();
    const QString savedType = crosshair.value(QStringLiteral("type")).toString(QStringLiteral("cross"));
    m_crosshairType->setCurrentText(savedType.left(1).toUpper() + savedType.mid(1));
    styleRow->addWidget(m_crosshairType, 1);
    controls->addLayout(styleRow);

    auto* colorRow = new QHBoxLayout();
    colorRow->addWidget(makeLabel(QStringLiteral("Color"), QStringLiteral("muted")));
    m_crosshairColorButton = new QPushButton();
    QColor savedColor(crosshair.value(QStringLiteral("color")).toString(QStringLiteral("#00ff00")));
    if (!savedColor.isValid()) savedColor = QColor(QStringLiteral("#00ff00"));
    m_crosshairColorButton->setProperty("crosshairColor", savedColor.name(QColor::HexRgb));
    m_crosshairColorButton->setText(savedColor.name(QColor::HexRgb));
    m_crosshairColorButton->setStyleSheet(QStringLiteral("background:#303030; border:1px solid #505050; border-left:12px solid %1; padding:5px 9px; border-radius:4px;").arg(savedColor.name()));
    connect(m_crosshairColorButton, &QPushButton::clicked, this, [this]() {
        const QColor current(m_crosshairColorButton->property("crosshairColor").toString());
        const QColor selected = QColorDialog::getColor(current, this, QStringLiteral("Crosshair color"));
        if (!selected.isValid()) return;
        m_crosshairColorButton->setProperty("crosshairColor", selected.name(QColor::HexRgb));
        m_crosshairColorButton->setText(selected.name(QColor::HexRgb));
        m_crosshairColorButton->setStyleSheet(QStringLiteral("background:#303030; border:1px solid #505050; border-left:12px solid %1; padding:5px 9px; border-radius:4px;").arg(selected.name()));
        updateCrosshairOptions();
    });
    colorRow->addWidget(m_crosshairColorButton, 1);
    controls->addLayout(colorRow);

    auto* sizeRow = new QHBoxLayout();
    sizeRow->addWidget(makeLabel(QStringLiteral("Size"), QStringLiteral("muted")));
    m_crosshairSize = new QSpinBox();
    m_crosshairSize->setRange(1, 10);
    m_crosshairSize->setValue(crosshair.value(QStringLiteral("size")).toInt(5));
    sizeRow->addWidget(m_crosshairSize);
    auto* opacityRow = new QHBoxLayout();
    opacityRow->addWidget(makeLabel(QStringLiteral("Opacity"), QStringLiteral("muted")));
    m_crosshairOpacity = new QSlider(Qt::Horizontal);
    m_crosshairOpacity->setRange(10, 100);
    m_crosshairOpacity->setValue(qRound(crosshair.value(QStringLiteral("opacity")).toDouble(0.8) * 100));
    auto* opacityValue = makeLabel(QStringLiteral("%1%").arg(m_crosshairOpacity->value()));
    opacityRow->addWidget(m_crosshairOpacity, 1);
    opacityRow->addWidget(opacityValue);
    controls->addLayout(sizeRow);
    controls->addLayout(opacityRow);
    m_crosshairToggle = new QPushButton(QStringLiteral("Show overlay"));
    m_crosshairToggle->setObjectName(QStringLiteral("primaryButton"));
    connect(m_crosshairToggle, &QPushButton::clicked, this, [this]() {
        if (!m_overlay) return;
        if (m_crosshairVisible) {
            m_overlay->hide();
            m_crosshairVisible = false;
            m_crosshairToggle->setText(QStringLiteral("Show overlay"));
            appendLog(QStringLiteral("INFO"), QStringLiteral("Crosshair overlay hidden"));
        } else {
            updateCrosshairOptions();
            m_overlay->show();
            m_overlay->raise();
            m_crosshairVisible = true;
            m_crosshairToggle->setText(QStringLiteral("Hide overlay"));
            appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Crosshair overlay shown"));
        }
    });
    controls->addWidget(m_crosshairToggle, 0, Qt::AlignLeft);
    crosshairLayout->addLayout(controls, 1);
    content->addWidget(crosshairCard);

    connect(m_crosshairType, &QComboBox::currentTextChanged, this, &MainWindow::updateCrosshairOptions);
    connect(m_crosshairSize, &QSpinBox::editingFinished, this, &MainWindow::updateCrosshairOptions);
    connect(m_crosshairOpacity, &QSlider::valueChanged, this, [this, opacityValue](int value) {
        opacityValue->setText(QStringLiteral("%1%").arg(value));
        refreshCrosshairPreview();
        if (m_overlay) m_overlay->setOptions(QJsonObject{
            {QStringLiteral("type"), m_crosshairType->currentText().toLower()},
            {QStringLiteral("color"), m_crosshairColorButton->property("crosshairColor").toString()},
            {QStringLiteral("size"), m_crosshairSize->value()},
            {QStringLiteral("opacity"), value / 100.0}
        });
    });
    connect(m_crosshairOpacity, &QSlider::sliderReleased, this, &MainWindow::updateCrosshairOptions);
    connect(m_crosshairSize, qOverload<int>(&QSpinBox::valueChanged), this, [this](int) {
        refreshCrosshairPreview();
        if (m_overlay) m_overlay->setOptions(QJsonObject{
            {QStringLiteral("type"), m_crosshairType->currentText().toLower()},
            {QStringLiteral("color"), m_crosshairColorButton->property("crosshairColor").toString()},
            {QStringLiteral("size"), m_crosshairSize->value()},
            {QStringLiteral("opacity"), m_crosshairOpacity->value() / 100.0}
        });
    });
    refreshCrosshairPreview();

    auto* crosshairNote = makeLabel(QStringLiteral("The crosshair is a transparent, click-through always-on-top window. Desktop compositor behavior may vary."), QStringLiteral("muted"));
    crosshairNote->setWordWrap(true);
    content->addWidget(crosshairNote);

    content->addWidget(createSectionHeading(QStringLiteral("Custom shift-lock cursor")));
    auto* cursorCard = new QFrame();
    cursorCard->setObjectName(QStringLiteral("settingCard"));
    auto* cursorLayout = new QHBoxLayout(cursorCard);
    cursorLayout->setContentsMargins(14, 14, 14, 14);
    cursorLayout->setSpacing(14);
    m_cursorPreview = new QLabel(QStringLiteral("Default"));
    m_cursorPreview->setFixedSize(120, 105);
    m_cursorPreview->setAlignment(Qt::AlignCenter);
    m_cursorPreview->setStyleSheet(QStringLiteral("background:#1e1e1e; border:1px dashed #4a4a4a; border-radius:4px; color:#8b8b8b;"));
    cursorLayout->addWidget(m_cursorPreview);
    auto* cursorCopy = new QVBoxLayout();
    cursorCopy->addWidget(makeLabel(QStringLiteral("MouseLockedCursor.png")));
    auto* cursorDescription = makeLabel(QStringLiteral("Choose a PNG, JPG, WebP, BMP, or GIF image. It is converted to PNG and installed in Sober’s asset overlay."), QStringLiteral("muted"));
    cursorDescription->setWordWrap(true);
    cursorCopy->addWidget(cursorDescription);
    m_cursorStatus = makeLabel(QStringLiteral("Using Roblox default"), QStringLiteral("muted"));
    cursorCopy->addWidget(m_cursorStatus);
    auto* cursorActions = new QHBoxLayout();
    auto* chooseCursor = new QPushButton(QStringLiteral("Choose image"));
    chooseCursor->setObjectName(QStringLiteral("primaryButton"));
    auto* removeCursorButton = new QPushButton(QStringLiteral("Remove"));
    removeCursorButton->setObjectName(QStringLiteral("secondaryButton"));
    m_cursorRestoreButton = new QPushButton(QStringLiteral("Restore previous"));
    m_cursorRestoreButton->setObjectName(QStringLiteral("secondaryButton"));
    cursorActions->addWidget(chooseCursor);
    cursorActions->addWidget(removeCursorButton);
    cursorActions->addWidget(m_cursorRestoreButton);
    cursorCopy->addLayout(cursorActions);
    cursorLayout->addLayout(cursorCopy, 1);
    content->addWidget(cursorCard);
    connect(chooseCursor, &QPushButton::clicked, this, &MainWindow::installCursor);
    connect(removeCursorButton, &QPushButton::clicked, this, &MainWindow::removeCursor);
    connect(m_cursorRestoreButton, &QPushButton::clicked, this, &MainWindow::restoreCursor);
    refreshCursorStatus();
    auto* cursorNote = makeLabel(QStringLiteral("Restart Sober after changing this texture. The previous cursor is kept as a backup for recovery."), QStringLiteral("muted"));
    cursorNote->setWordWrap(true);
    content->addWidget(cursorNote);

    content->addWidget(createSectionHeading(QStringLiteral("Custom sky texture")));
    auto* skyboxNote = makeLabel(QStringLiteral(
        "Roblox skyboxes use six square faces. Choose Front, Back, Up, Down, Left, and Right images; SoberTrap converts them to Android ETC1 textures."), QStringLiteral("muted"));
    skyboxNote->setWordWrap(true);
    content->addWidget(skyboxNote);

    auto* faceGrid = new QGridLayout();
    faceGrid->setContentsMargins(0, 0, 0, 0);
    faceGrid->setHorizontalSpacing(8);
    faceGrid->setVerticalSpacing(7);
    const QList<QPair<QString, QString>> faces = {
        {QStringLiteral("ft"), QStringLiteral("Front")},
        {QStringLiteral("bk"), QStringLiteral("Back")},
        {QStringLiteral("up"), QStringLiteral("Up")},
        {QStringLiteral("dn"), QStringLiteral("Down")},
        {QStringLiteral("lf"), QStringLiteral("Left")},
        {QStringLiteral("rt"), QStringLiteral("Right")}
    };
    for (int i = 0; i < faces.size(); ++i) {
        const QString face = faces.at(i).first;
        const QString faceLabel = faces.at(i).second;
        auto* card = new QFrame();
        card->setObjectName(QStringLiteral("settingCard"));
        auto* row = new QHBoxLayout(card);
        row->setContentsMargins(9, 7, 9, 7);
        row->setSpacing(8);
        auto* name = makeLabel(faceLabel);
        name->setMinimumWidth(44);
        auto* choose = new QPushButton(QStringLiteral("Choose image"));
        choose->setObjectName(QStringLiteral("secondaryButton"));
        choose->setMinimumWidth(105);
        auto* filename = makeLabel(QStringLiteral("Not selected"), QStringLiteral("muted"));
        filename->setMinimumWidth(70);
        filename->setMaximumWidth(150);
        filename->setWordWrap(true);
        row->addWidget(name);
        row->addWidget(choose);
        row->addWidget(filename, 1);
        faceGrid->addWidget(card, i / 2, i % 2);
        m_skyboxFaceLabels.insert(face, filename);
        connect(choose, &QPushButton::clicked, this, [this, face]() { chooseSkyboxFace(face); });
    }
    content->addLayout(faceGrid);

    auto* skyboxActions = new QHBoxLayout();
    m_skyboxInstallButton = new QPushButton(QStringLiteral("Install custom sky"));
    m_skyboxInstallButton->setObjectName(QStringLiteral("primaryButton"));
    m_skyboxInstallButton->setEnabled(false);
    m_skyboxRestoreButton = new QPushButton(QStringLiteral("Restore previous/default"));
    m_skyboxRestoreButton->setObjectName(QStringLiteral("secondaryButton"));
    skyboxActions->addWidget(m_skyboxInstallButton);
    skyboxActions->addWidget(m_skyboxRestoreButton);
    skyboxActions->addStretch();
    content->addLayout(skyboxActions);
    m_skyboxStatus = makeLabel(QString(), QStringLiteral("muted"));
    content->addWidget(m_skyboxStatus);
    connect(m_skyboxInstallButton, &QPushButton::clicked, this, &MainWindow::installSkybox);
    connect(m_skyboxRestoreButton, &QPushButton::clicked, this, &MainWindow::restoreSkybox);
    refreshSkyboxStatus();

    auto* skyboxRestartNote = makeLabel(QStringLiteral("Restart Sober after installing or restoring sky textures. Your previous overlay files are backed up automatically."), QStringLiteral("muted"));
    skyboxRestartNote->setWordWrap(true);
    content->addWidget(skyboxRestartNote);
    content->addStretch();
    return page;
}

void MainWindow::refreshCrosshairPreview()
{
    if (!m_crosshairPreview || !m_crosshairType || !m_crosshairSize || !m_crosshairOpacity || !m_crosshairColorButton) return;
    const QColor color(m_crosshairColorButton->property("crosshairColor").toString());
    const QString type = m_crosshairType->currentText().toLower();
    const qreal size = qMax<qreal>(4.0, m_crosshairSize->value() * 3.0);
    QPixmap pixmap(m_crosshairPreview->size());
    pixmap.fill(Qt::transparent);
    QPainter painter(&pixmap);
    painter.setRenderHint(QPainter::Antialiasing, true);
    painter.setOpacity(m_crosshairOpacity->value() / 100.0);
    painter.setPen(QPen(color.isValid() ? color : QColor(QStringLiteral("#00ff00")), type == QStringLiteral("plus") ? 3.0 : 2.0, Qt::SolidLine, Qt::RoundCap));
    painter.setBrush(color.isValid() ? color : QColor(QStringLiteral("#00ff00")));
    const QPointF center(pixmap.width() / 2.0, pixmap.height() / 2.0);
    if (type == QStringLiteral("dot")) painter.drawEllipse(center, qMax<qreal>(2.0, size * .35), qMax<qreal>(2.0, size * .35));
    else if (type == QStringLiteral("circle")) { painter.setBrush(Qt::NoBrush); painter.drawEllipse(center, size * .7, size * .7); }
    else {
        if (type == QStringLiteral("crosshair")) { painter.setBrush(Qt::NoBrush); painter.drawEllipse(center, size * .45, size * .45); }
        painter.drawLine(QPointF(center.x() - size, center.y()), QPointF(center.x() + size, center.y()));
        painter.drawLine(QPointF(center.x(), center.y() - size), QPointF(center.x(), center.y() + size));
    }
    m_crosshairPreview->setPixmap(pixmap);
}

void MainWindow::updateCrosshairOptions()
{
    if (!m_crosshairType || !m_crosshairColorButton || !m_crosshairSize || !m_crosshairOpacity) return;
    const QJsonObject options{
        {QStringLiteral("type"), m_crosshairType->currentText().toLower()},
        {QStringLiteral("color"), m_crosshairColorButton->property("crosshairColor").toString()},
        {QStringLiteral("size"), m_crosshairSize->value()},
        {QStringLiteral("opacity"), m_crosshairOpacity->value() / 100.0}
    };
    m_tunerConfig.insert(QStringLiteral("crosshair"), options);
    if (m_overlay) m_overlay->setOptions(options);
    refreshCrosshairPreview();
    persistTunerConfig(QStringLiteral("Crosshair settings saved"));
}

void MainWindow::refreshCursorStatus()
{
    if (!m_cursorPreview || !m_cursorStatus) return;
    QString error;
    if (m_store.hasCursor()) {
        const QImage image = m_store.loadCursorPreview(&error);
        if (!image.isNull()) {
            m_cursorPreview->setText(QString());
            m_cursorPreview->setPixmap(QPixmap::fromImage(image).scaled(m_cursorPreview->size() - QSize(12, 12), Qt::KeepAspectRatio, Qt::SmoothTransformation));
            const QFileInfo info(m_store.cursorPath());
            m_cursorStatus->setText(QStringLiteral("Installed · %1×%2 · %3 KB")
                .arg(image.width()).arg(image.height()).arg((info.size() + 1023) / 1024));
        } else {
            m_cursorPreview->setPixmap(QPixmap());
            m_cursorPreview->setText(QStringLiteral("Invalid image"));
            m_cursorStatus->setText(QStringLiteral("Could not preview cursor: %1").arg(error));
        }
    } else {
        m_cursorPreview->setPixmap(QPixmap());
        m_cursorPreview->setText(QStringLiteral("Default"));
        m_cursorStatus->setText(QStringLiteral("Using Roblox default"));
    }
    if (m_cursorRestoreButton) m_cursorRestoreButton->setEnabled(m_store.hasCursorBackup());
}

void MainWindow::installCursor()
{
    const QString path = QFileDialog::getOpenFileName(this, QStringLiteral("Choose shift-lock cursor image"),
        QDir::homePath(), QStringLiteral("Images (*.png *.jpg *.jpeg *.webp *.bmp *.gif)"));
    if (path.isEmpty()) return;
    QString error;
    if (!m_store.installCursor(path, &error)) {
        QMessageBox::critical(this, QStringLiteral("Cursor installation failed"), error);
        setStatus(QStringLiteral("Cursor installation failed"), true);
        appendLog(QStringLiteral("ERROR"), error);
        return;
    }
    setStatus(QStringLiteral("Custom shift-lock cursor installed"));
    appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Cursor texture installed; restart Sober to apply"));
    refreshCursorStatus();
}

void MainWindow::removeCursor()
{
    if (!m_store.hasCursor()) return;
    if (QMessageBox::question(this, QStringLiteral("Remove custom cursor"),
        QStringLiteral("Remove the custom cursor and revert to Roblox's default? The backup will be kept."),
        QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel) != QMessageBox::Yes) return;
    QString error;
    if (!m_store.removeCursor(&error)) {
        setStatus(error, true);
        return;
    }
    setStatus(QStringLiteral("Custom cursor removed; restart Sober to apply"));
    refreshCursorStatus();
}

void MainWindow::restoreCursor()
{
    if (!m_store.hasCursorBackup()) return;
    if (QMessageBox::question(this, QStringLiteral("Restore previous cursor"),
        QStringLiteral("Replace the current shift-lock cursor with the previous backup?"),
        QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel) != QMessageBox::Yes) return;
    QString error;
    if (!m_store.restoreCursor(&error)) {
        setStatus(error, true);
        QMessageBox::critical(this, QStringLiteral("Cursor restore failed"), error);
        return;
    }
    setStatus(QStringLiteral("Previous cursor restored; restart Sober to apply"));
    refreshCursorStatus();
}

void MainWindow::chooseSkyboxFace(const QString& face)
{
    static const QMap<QString, QString> displayNames = {
        {QStringLiteral("bk"), QStringLiteral("Back")},
        {QStringLiteral("dn"), QStringLiteral("Down")},
        {QStringLiteral("ft"), QStringLiteral("Front")},
        {QStringLiteral("lf"), QStringLiteral("Left")},
        {QStringLiteral("rt"), QStringLiteral("Right")},
        {QStringLiteral("up"), QStringLiteral("Up")}
    };
    const QString faceName = displayNames.value(face, face.toUpper());
    const QString path = QFileDialog::getOpenFileName(this,
        QStringLiteral("Choose %1 sky face").arg(faceName), QDir::homePath(),
        QStringLiteral("Images (*.png *.jpg *.jpeg *.webp *.bmp *.gif)"));
    if (path.isEmpty()) return;

    QImageReader reader(path);
    reader.setAutoTransform(true);
    const QImage image = reader.read();
    if (image.isNull()) {
        QMessageBox::warning(this, QStringLiteral("Image could not be read"), reader.errorString());
        return;
    }
    if (image.width() != image.height()) {
        QMessageBox::warning(this, QStringLiteral("Square image required"),
            QStringLiteral("The %1 face must be a square image.").arg(faceName));
        return;
    }
    m_skyboxFacePaths.insert(face, path);
    if (QLabel* label = m_skyboxFaceLabels.value(face, nullptr)) label->setText(QFileInfo(path).fileName());
    if (m_skyboxInstallButton) m_skyboxInstallButton->setEnabled(m_skyboxFacePaths.size() == 6);
    setStatus(QStringLiteral("Selected %1 sky face").arg(faceName));
}

void MainWindow::installSkybox()
{
    if (m_skyboxFacePaths.size() != 6) {
        setStatus(QStringLiteral("Choose all six square sky images first"), true);
        return;
    }

    QProgressDialog progress(QStringLiteral("Converting sky faces to ETC1 textures…"),
                             QString(), 0, 66, this);
    progress.setWindowTitle(QStringLiteral("Installing custom sky"));
    progress.setWindowModality(Qt::WindowModal);
    progress.setCancelButton(nullptr);
    progress.setMinimumDuration(0);
    progress.setAutoClose(false);
    progress.setAutoReset(false);
    progress.show();
    QApplication::processEvents();

    QString error;
    const bool installed = m_store.installSkyboxImages(m_skyboxFacePaths, &error,
        [&progress](int value, int maximum) {
            progress.setMaximum(maximum);
            progress.setValue(value);
            progress.setLabelText(QStringLiteral("Encoding sky face %1 of 6…")
                .arg((value + 10) / 11));
            QApplication::processEvents();
        });
    progress.close();

    if (!installed) {
        setStatus(QStringLiteral("Sky texture install failed"), true);
        appendLog(QStringLiteral("ERROR"), error);
        QMessageBox::critical(this, QStringLiteral("Sky texture install failed"), error);
        refreshSkyboxStatus();
        return;
    }
    setStatus(QStringLiteral("Custom sky textures installed; restart Sober to apply"));
    appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Installed six custom ETC1 sky textures"));
    refreshSkyboxStatus();
}

void MainWindow::restoreSkybox()
{
    if (!m_store.hasSkyboxBackup()) return;
    if (QMessageBox::question(this, QStringLiteral("Restore original sky textures"),
        QStringLiteral("Restore the sky overlay files that were present before the custom sky was installed?"),
        QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel) != QMessageBox::Yes) return;

    QString error;
    if (!m_store.restoreSkybox(&error)) {
        setStatus(QStringLiteral("Could not restore sky textures: %1").arg(error), true);
        QMessageBox::critical(this, QStringLiteral("Sky restore failed"), error);
        return;
    }
    setStatus(QStringLiteral("Previous sky textures restored; restart Sober to apply"));
    appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Restored the previous Sober sky textures"));
    m_skyboxFacePaths.clear();
    for (QLabel* label : m_skyboxFaceLabels) label->setText(QStringLiteral("Not selected"));
    if (m_skyboxInstallButton) m_skyboxInstallButton->setEnabled(false);
    refreshSkyboxStatus();
}

void MainWindow::refreshSkyboxStatus()
{
    if (m_skyboxStatus) {
        if (m_store.hasCustomSkybox()) {
            m_skyboxStatus->setText(QStringLiteral("Custom skybox is installed. Restart Sober to see it in-game."));
        } else {
            m_skyboxStatus->setText(QStringLiteral("Using the sky textures currently supplied by Sober."));
        }
    }
    if (m_skyboxRestoreButton) m_skyboxRestoreButton->setEnabled(m_store.hasSkyboxBackup());
    if (m_skyboxInstallButton) m_skyboxInstallButton->setEnabled(m_skyboxFacePaths.size() == 6);
}

QWidget* MainWindow::buildBackupsPage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Global settings and backups"),
        QStringLiteral("Create a safe copy of the Sober config and restore a previous version when needed."), &content);
    auto* actionCard = new QFrame();
    actionCard->setObjectName(QStringLiteral("settingCard"));
    auto* actionLayout = new QHBoxLayout(actionCard);
    actionLayout->setContentsMargins(14, 12, 14, 12);
    auto* copy = new QVBoxLayout();
    copy->addWidget(makeLabel(QStringLiteral("Sober configuration backups")));
    auto* description = makeLabel(QStringLiteral("Backups are stored beside config.json and listed newest first."), QStringLiteral("muted"));
    description->setWordWrap(true);
    copy->addWidget(description);
    actionLayout->addLayout(copy, 1);
    auto* create = new QPushButton(QStringLiteral("Create backup"));
    create->setObjectName(QStringLiteral("primaryButton"));
    auto* refresh = new QPushButton(QStringLiteral("Refresh"));
    refresh->setObjectName(QStringLiteral("secondaryButton"));
    connect(create, &QPushButton::clicked, this, &MainWindow::createBackup);
    connect(refresh, &QPushButton::clicked, this, &MainWindow::refreshBackups);
    actionLayout->addWidget(create);
    actionLayout->addWidget(refresh);
    content->addWidget(actionCard);
    content->addWidget(createSectionHeading(QStringLiteral("Recent backups")));
    auto* listHost = new QWidget();
    m_backupsListLayout = new QVBoxLayout(listHost);
    m_backupsListLayout->setContentsMargins(0, 0, 0, 0);
    m_backupsListLayout->setSpacing(6);
    content->addWidget(listHost);
    content->addStretch();
    refreshBackups();
    return page;
}

void MainWindow::refreshBackups()
{
    if (!m_backupsListLayout) return;
    clearLayout(m_backupsListLayout);
    const QStringList backups = m_store.listBackups();
    if (backups.isEmpty()) {
        auto* empty = makeLabel(QStringLiteral("No backups found. Create one before making configuration changes."), QStringLiteral("muted"));
        empty->setAlignment(Qt::AlignCenter);
        empty->setMinimumHeight(65);
        m_backupsListLayout->addWidget(empty);
        return;
    }
    for (const QString& filename : backups) {
        auto* card = new QFrame();
        card->setObjectName(QStringLiteral("settingCard"));
        auto* row = new QHBoxLayout(card);
        row->setContentsMargins(12, 8, 12, 8);
        auto* name = makeLabel(filename);
        name->setStyleSheet(QStringLiteral("font-family:'Cascadia Code','Fira Code',monospace; font-size:10px;"));
        row->addWidget(name, 1);
        auto* restore = new QPushButton(QStringLiteral("Restore"));
        restore->setObjectName(QStringLiteral("secondaryButton"));
        connect(restore, &QPushButton::clicked, this, [this, filename]() { restoreBackup(filename); });
        row->addWidget(restore);
        m_backupsListLayout->addWidget(card);
    }
}

void MainWindow::createBackup()
{
    if (m_configDirty) {
        const auto answer = QMessageBox::question(this, QStringLiteral("Save before backup?"),
            QStringLiteral("Save your pending changes before creating the backup?"),
            QMessageBox::Save | QMessageBox::Cancel, QMessageBox::Save);
        if (answer != QMessageBox::Save) return;
        saveConfig();
        if (m_configDirty) return;
    }
    QString path;
    QString error;
    if (!m_store.createBackup(&path, &error)) {
        setStatus(QStringLiteral("Backup failed: %1").arg(error), true);
        QMessageBox::critical(this, QStringLiteral("Backup failed"), error);
        return;
    }
    setStatus(QStringLiteral("Backup created: %1").arg(QFileInfo(path).fileName()));
    appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Created config backup %1").arg(QFileInfo(path).fileName()));
    refreshBackups();
}

void MainWindow::restoreBackup(const QString& filename)
{
    if (m_configDirty) {
        const auto answer = QMessageBox::question(this, QStringLiteral("Discard unsaved changes?"),
            QStringLiteral("Restoring a backup replaces your current config and discards unsaved changes."),
            QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel);
        if (answer != QMessageBox::Yes) return;
    } else if (QMessageBox::question(this, QStringLiteral("Restore backup"),
        QStringLiteral("Restore %1? This replaces the current Sober config.").arg(filename),
        QMessageBox::Yes | QMessageBox::Cancel, QMessageBox::Cancel) != QMessageBox::Yes) {
        return;
    }
    if (m_configLoaded) {
        QString safetyBackup;
        QString backupError;
        if (!m_store.createBackup(&safetyBackup, &backupError)) {
            QMessageBox::critical(this, QStringLiteral("Safety backup failed"),
                QStringLiteral("SoberTrap could not make a safety copy of the current config, so the restore was cancelled.\n\n%1")
                    .arg(backupError));
            setStatus(QStringLiteral("Restore cancelled: safety backup failed"), true);
            return;
        }
    }
    QJsonObject restored;
    QString error;
    if (!m_store.restoreBackup(filename, &restored, &error)) {
        setStatus(QStringLiteral("Restore failed: %1").arg(error), true);
        QMessageBox::critical(this, QStringLiteral("Restore failed"), error);
        return;
    }
    m_config = restored;
    m_configLoaded = true;
    m_configDirty = false;
    setStatus(QStringLiteral("Configuration restored"));
    appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Restored config backup %1").arg(filename));
    updateStatusAndStats();
    refreshFastFlags();
    refreshBackups();
}

QWidget* MainWindow::buildIntegrationsPage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("Integrations"),
        QStringLiteral("Configure additional functionality to go alongside Roblox."), &content);
    content->addWidget(createSectionHeading(QStringLiteral("Activity and presence")));
    const QList<QPair<QString, QStringList>> integrations = {
        {QStringLiteral("Discord Rich Presence"), {QStringLiteral("Sober manages Discord presence directly when enabled in its own settings."), QStringLiteral("Available")}},
        {QStringLiteral("Roblox Cloud"), {QStringLiteral("Cloud synchronization is not available in SoberTrap yet."), QStringLiteral("Coming soon")}}
    };
    for (const auto& item : integrations) {
        auto* status = new QLabel(item.second.at(1));
        status->setAlignment(Qt::AlignCenter);
        status->setStyleSheet(item.second.at(1) == QStringLiteral("Available")
            ? QStringLiteral("color:#a9c9a9; border:1px solid #405440; border-radius:10px; padding:3px 8px; font-size:9px;")
            : QStringLiteral("color:#929292; border:1px solid #4a4a4a; border-radius:10px; padding:3px 8px; font-size:9px;"));
        content->addWidget(createSettingCard(item.first, item.second.at(0), status));
    }
    content->addStretch();
    return page;
}

QWidget* MainWindow::buildAboutPage()
{
    QVBoxLayout* content = nullptr;
    QWidget* page = createPage(QStringLiteral("About SoberTrap"),
        QStringLiteral("A settings manager for Sober on Linux."), &content);
    auto* card = new QFrame();
    card->setObjectName(QStringLiteral("settingCard"));
    auto* row = new QHBoxLayout(card);
    row->setContentsMargins(17, 16, 17, 16);
    auto* logo = makeLabel(QStringLiteral("S"), QStringLiteral("brandMark"));
    logo->setAlignment(Qt::AlignCenter);
    logo->setFixedSize(42, 42);
    row->addWidget(logo);
    auto* copy = new QVBoxLayout();
    copy->addWidget(makeLabel(QStringLiteral("SoberTrap")));
    copy->addWidget(makeLabel(QStringLiteral("Version %1 · Native Qt desktop app").arg(QStringLiteral(SOBERTRAP_VERSION)), QStringLiteral("muted")));
    row->addLayout(copy, 1);
    content->addWidget(card);
    content->addWidget(createSectionHeading(QStringLiteral("Runtime and configuration")));

    const QStringList labels = {
        QStringLiteral("Platform"), QStringLiteral("UI toolkit"), QStringLiteral("Sober config"), QStringLiteral("Tuner settings")
    };
    const QStringList values = {
        QStringLiteral("Linux"), QStringLiteral("Qt %1").arg(qVersion()), m_store.configPath(), m_store.tunerPath()
    };
    for (int i = 0; i < labels.size(); ++i) {
        auto* value = makeLabel(values.at(i));
        value->setWordWrap(true);
        value->setTextInteractionFlags(Qt::TextSelectableByMouse);
        const QString detail = i < 2 ? QStringLiteral("Current runtime value") : QStringLiteral("Select text to copy the path");
        content->addWidget(createSettingCard(labels.at(i), detail, value));
    }
    auto* disclaimer = makeLabel(QStringLiteral("SoberTrap is not affiliated with or endorsed by Roblox Corporation."), QStringLiteral("muted"));
    disclaimer->setAlignment(Qt::AlignCenter);
    content->addWidget(disclaimer);
    content->addStretch();
    return page;
}

void MainWindow::startSober()
{
    const QString flatpak = QStandardPaths::findExecutable(QStringLiteral("flatpak"));
    if (flatpak.isEmpty()) {
        const QString message = QStringLiteral("Flatpak was not found on PATH.");
        setStatus(message, true);
        appendLog(QStringLiteral("ERROR"), message);
        return;
    }
    qint64 processId = 0;
    appendLog(QStringLiteral("INFO"), QStringLiteral("Running flatpak run org.vinegarhq.Sober"));
    if (!QProcess::startDetached(flatpak,
        {QStringLiteral("run"), QStringLiteral("org.vinegarhq.Sober")}, QDir::homePath(), &processId)) {
        const QString message = QStringLiteral("Could not start Sober through Flatpak.");
        setStatus(message, true);
        appendLog(QStringLiteral("ERROR"), message);
        return;
    }
    setStatus(QStringLiteral("Sober launched"));
    appendLog(QStringLiteral("SUCCESS"), QStringLiteral("Sober launched (PID %1)").arg(processId));
    if (m_launchButton) {
        m_launchButton->setText(QStringLiteral("Sober started"));
        m_launchButton->setEnabled(false);
        QTimer::singleShot(1800, this, [this]() {
            if (m_launchButton) {
                m_launchButton->setText(QStringLiteral("Start Sober"));
                m_launchButton->setEnabled(true);
            }
        });
    }
}

void MainWindow::closeEvent(QCloseEvent* event)
{
    if (m_configDirty) {
        const auto answer = QMessageBox::warning(this, QStringLiteral("Unsaved changes"),
            QStringLiteral("Save your FastFlag changes before closing?"),
            QMessageBox::Save | QMessageBox::Discard | QMessageBox::Cancel, QMessageBox::Save);
        if (answer == QMessageBox::Cancel) {
            event->ignore();
            return;
        }
        if (answer == QMessageBox::Save) {
            saveConfig();
            if (m_configDirty) {
                event->ignore();
                return;
            }
        }
    }
    if (m_overlay) m_overlay->hide();
    event->accept();
}
