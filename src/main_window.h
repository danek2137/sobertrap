#pragma once

#include "config_store.h"

#include <QJsonObject>
#include <QIcon>
#include <QHash>
#include <QMainWindow>
#include <QStackedWidget>
#include <QVector>

class QCloseEvent;
class QComboBox;
class QLabel;
class QLineEdit;
class QPlainTextEdit;
class QPushButton;
class QSlider;
class QSpinBox;
class QTableWidget;
class QVBoxLayout;
class CrosshairOverlay;

class MainWindow final : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget* parent = nullptr);

protected:
    void closeEvent(QCloseEvent* event) override;

private:
    struct NavigationEntry {
        QString id;
        QString label;
        QString group;
        QIcon icon;
        QPushButton* button = nullptr;
    };

    void buildInterface();
    QWidget* createPage(const QString& title, const QString& description, QVBoxLayout** contentLayout);
    QWidget* createSettingCard(const QString& title, const QString& description, QWidget* control);
    QWidget* createSectionHeading(const QString& title);
    QWidget* createStatCard(const QString& title, const QString& value);
    void addPage(const QString& id, QWidget* page, const QString& label, const QIcon& icon,
                 const QString& group = QStringLiteral("SETTINGS"));
    void switchPage(const QString& id);
    void filterNavigation(const QString& text);
    void setStatus(const QString& message, bool error = false);
    void appendLog(const QString& level, const QString& message);
    void updateStatusAndStats();

    QJsonObject fflags() const;
    void setFlag(const QString& key, const QJsonValue& value);
    void removeFlag(const QString& key);
    bool flagAsBool(const QString& key) const;
    void toggleFlag(const QString& key);
    void markConfigDirty();
    void saveConfig();
    bool persistTunerConfig(const QString& successMessage = QString());

    QWidget* buildHomePage();
    QWidget* buildSettingsPage();
    QWidget* buildFastFlagsPage();
    QWidget* buildPresetsPage();
    QWidget* buildProfilesPage();
    QWidget* buildAppearancePage();
    QWidget* buildBackupsPage();
    QWidget* buildIntegrationsPage();
    QWidget* buildAboutPage();
    void refreshFastFlags();
    void refreshProfiles();
    void refreshBackups();
    void refreshCursorStatus();
    void refreshCrosshairPreview();
    void updateCrosshairOptions();
    void startSober();
    void createBackup();
    void restoreBackup(const QString& filename);
    void applyPreset(const QString& name, const QJsonObject& preset);
    void clearFlags();
    void createProfile(bool fromCurrent);
    void updateProfile(const QString& id);
    void applyProfile(const QString& id);
    void renameProfile(const QString& id);
    void deleteProfile(const QString& id);
    void installCursor();
    void removeCursor();
    void restoreCursor();
    void chooseSkyboxFace(const QString& face);
    void installSkybox();
    void restoreSkybox();
    void refreshSkyboxStatus();
    void showHelpMessage(const QString& title, const QString& message);

    ConfigStore m_store;
    QJsonObject m_config;
    QJsonObject m_tunerConfig;
    bool m_configLoaded = false;
    bool m_tunerLoaded = false;
    bool m_configDirty = false;
    QString m_activePage;

    QWidget* m_sidebar = nullptr;
    QLineEdit* m_navigationSearch = nullptr;
    QVBoxLayout* m_navigationLayout = nullptr;
    QStackedWidget* m_pages = nullptr;
    QLabel* m_statusLabel = nullptr;
    QLabel* m_configCountLabel = nullptr;
    QPushButton* m_saveButton = nullptr;
    QPushButton* m_saveAndRunButton = nullptr;
    QPlainTextEdit* m_activityLog = nullptr;
    QPushButton* m_launchButton = nullptr;
    QVector<NavigationEntry> m_navigation;
    QHash<QString, int> m_pageIndices;

    QLineEdit* m_flagSearch = nullptr;
    QLineEdit* m_settingsSearch = nullptr;
    QTableWidget* m_flagTable = nullptr;
    QLabel* m_flagCountLabel = nullptr;
    QVBoxLayout* m_profilesListLayout = nullptr;
    QVBoxLayout* m_backupsListLayout = nullptr;

    QLabel* m_cursorPreview = nullptr;
    QLabel* m_cursorStatus = nullptr;
    QPushButton* m_cursorRestoreButton = nullptr;
    QLabel* m_crosshairPreview = nullptr;
    QComboBox* m_crosshairType = nullptr;
    QPushButton* m_crosshairColorButton = nullptr;
    QSpinBox* m_crosshairSize = nullptr;
    QSlider* m_crosshairOpacity = nullptr;
    QPushButton* m_crosshairToggle = nullptr;
    QMap<QString, QString> m_skyboxFacePaths;
    QMap<QString, QLabel*> m_skyboxFaceLabels;
    QLabel* m_skyboxStatus = nullptr;
    QPushButton* m_skyboxInstallButton = nullptr;
    QPushButton* m_skyboxRestoreButton = nullptr;
    bool m_crosshairVisible = false;
    CrosshairOverlay* m_overlay = nullptr;
};
