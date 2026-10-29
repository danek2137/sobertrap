#pragma once

#include <QImage>
#include <QByteArray>
#include <QJsonObject>
#include <QMap>
#include <QString>
#include <QStringList>

#include <functional>

class ConfigStore {
public:
    explicit ConfigStore(const QString& homeDirectory = QString());

    QString configPath() const;
    QString tunerPath() const;
    QString cursorPath() const;
    QString backupDirectory() const;
    QString cursorBackupPath() const;
    QString skyboxDirectory() const;
    QString skyboxBackupDirectory() const;

    bool loadConfig(QJsonObject* config, QString* error = nullptr) const;
    bool saveConfig(const QJsonObject& config, QString* error = nullptr) const;
    bool createBackup(QString* createdPath = nullptr, QString* error = nullptr) const;
    QStringList listBackups(QString* error = nullptr) const;
    bool restoreBackup(const QString& filename, QJsonObject* restoredConfig,
                       QString* error = nullptr) const;

    bool loadTunerConfig(QJsonObject* config, QString* error = nullptr) const;
    bool saveTunerConfig(const QJsonObject& config, QString* error = nullptr) const;

    bool hasCursor() const;
    bool hasCursorBackup() const;
    QImage loadCursorPreview(QString* error = nullptr) const;
    bool installCursor(const QString& sourcePath, QString* error = nullptr);
    bool removeCursor(QString* error = nullptr) const;
    bool restoreCursor(QString* error = nullptr) const;

    bool hasCustomSkybox() const;
    bool hasSkyboxBackup() const;
    bool installSkyboxImages(const QMap<QString, QString>& faceImages, QString* error = nullptr,
                             const std::function<void(int, int)>& progress = {});
    bool installSkyboxTextures(const QMap<QString, QByteArray>& faceTextures, QString* error = nullptr);
    bool restoreSkybox(QString* error = nullptr) const;
    static QStringList skyboxFaceKeys();

    static bool parseJsonWithComments(const QByteArray& bytes, QJsonObject* object,
                                      QString* error = nullptr);

private:
    QString m_configPath;
    QString m_tunerPath;
    QString m_cursorPath;
    QString m_skyboxDirectory;
    QString m_skyboxBackupDirectory;
    QString skyboxManifestPath() const;
    QString skyboxMarkerPath() const;
};
