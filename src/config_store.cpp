#include "config_store.h"

#include <QBuffer>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QImageReader>
#include <QImageWriter>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonParseError>
#include <QProcess>
#include <QStandardPaths>
#include <QSaveFile>
#include <QTemporaryDir>

#include <utility>

namespace {
QString messageForFileError(const QString& action, const QString& path, const QString& detail)
{
    return QStringLiteral("%1 '%2': %3").arg(action, path, detail);
}

bool writeAtomically(const QString& path, const QByteArray& bytes, QString* error)
{
    const QFileInfo info(path);
    if (!QDir().mkpath(info.absolutePath())) {
        if (error) *error = QStringLiteral("Could not create directory: %1").arg(info.absolutePath());
        return false;
    }

    QSaveFile file(path);
    if (!file.open(QIODevice::WriteOnly)) {
        if (error) *error = messageForFileError(QStringLiteral("Could not write"), path, file.errorString());
        return false;
    }
    if (file.write(bytes) != bytes.size()) {
        if (error) *error = messageForFileError(QStringLiteral("Could not write"), path, file.errorString());
        file.cancelWriting();
        return false;
    }
    if (!file.commit()) {
        if (error) *error = messageForFileError(QStringLiteral("Could not replace"), path, file.errorString());
        return false;
    }
    return true;
}

QByteArray serializeObject(const QJsonObject& object)
{
    QByteArray bytes;
    bytes += "// !!! STOP !!!\n";
    bytes += "// This file is managed by SoberTrap.\n";
    bytes += "// Last edited at ";
    bytes += QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs).toUtf8();
    bytes += "\n// -------------------------------------------\n";
    bytes += QJsonDocument(object).toJson(QJsonDocument::Indented);
    return bytes;
}

void appendU32LittleEndian(QByteArray& bytes, quint32 value)
{
    bytes.append(static_cast<char>(value & 0xff));
    bytes.append(static_cast<char>((value >> 8) & 0xff));
    bytes.append(static_cast<char>((value >> 16) & 0xff));
    bytes.append(static_cast<char>((value >> 24) & 0xff));
}

quint32 readU32LittleEndian(const QByteArray& bytes, qsizetype offset)
{
    if (offset < 0 || offset + 4 > bytes.size()) return 0;
    return static_cast<quint32>(static_cast<uchar>(bytes.at(offset))) |
        (static_cast<quint32>(static_cast<uchar>(bytes.at(offset + 1))) << 8) |
        (static_cast<quint32>(static_cast<uchar>(bytes.at(offset + 2))) << 16) |
        (static_cast<quint32>(static_cast<uchar>(bytes.at(offset + 3))) << 24);
}

QString findEtc1Tool()
{
    const QString overridePath = qEnvironmentVariable("SOBERTRAP_ETC1TOOL_PATH",
        qEnvironmentVariable("SOBERTUNER_ETC1TOOL_PATH"));
    if (!overridePath.isEmpty() && QFileInfo(overridePath).isExecutable()) return overridePath;
    const QString fromPath = QStandardPaths::findExecutable(QStringLiteral("etc1tool"));
    if (!fromPath.isEmpty()) return fromPath;

    QStringList sdkRoots;
    const QString androidHome = qEnvironmentVariable("ANDROID_HOME");
    const QString androidSdkRoot = qEnvironmentVariable("ANDROID_SDK_ROOT");
    if (!androidHome.isEmpty()) sdkRoots.append(androidHome);
    if (!androidSdkRoot.isEmpty()) sdkRoots.append(androidSdkRoot);
    sdkRoots.append(QDir::home().filePath(QStringLiteral("Android/Sdk")));
    sdkRoots.append(QDir::home().filePath(QStringLiteral("android-sdk")));
    for (const QString& root : std::as_const(sdkRoots)) {
        const QString candidate = QDir(root).filePath(QStringLiteral("platform-tools/etc1tool"));
        if (QFileInfo(candidate).isExecutable()) return candidate;
    }
    return {};
}

QString skyboxFilename(const QString& face)
{
    return QStringLiteral("sky512_%1.tex").arg(face);
}
}

ConfigStore::ConfigStore(const QString& homeDirectory)
{
    const QString home = homeDirectory.isEmpty() ? QDir::homePath() : homeDirectory;
    const QString soberConfig = QDir(home).filePath(
        QStringLiteral(".var/app/org.vinegarhq.Sober/config/sober"));
    m_configPath = QDir(soberConfig).filePath(QStringLiteral("config.json"));
    m_tunerPath = QDir(soberConfig).filePath(QStringLiteral("tuner.json"));
    m_cursorPath = QDir(home).filePath(
        QStringLiteral(".var/app/org.vinegarhq.Sober/data/sober/asset_overlay/"
                       "content/textures/MouseLockedCursor.png"));
    m_skyboxDirectory = QDir(home).filePath(
        QStringLiteral(".var/app/org.vinegarhq.Sober/data/sober/asset_overlay/android/textures/sky"));
    m_skyboxBackupDirectory = QDir(home).filePath(
        QStringLiteral(".var/app/org.vinegarhq.Sober/data/sober/sobertuner/skybox-backup"));

    const QString configOverride = qEnvironmentVariable("SOBERTUNER_CONFIG_PATH");
    const QString tunerOverride = qEnvironmentVariable("SOBERTUNER_TUNER_CONFIG_PATH");
    const QString cursorOverride = qEnvironmentVariable("SOBERTUNER_CURSOR_PATH");
    const QString skyboxOverride = qEnvironmentVariable("SOBERTUNER_SKYBOX_DIR");
    const QString skyboxBackupOverride = qEnvironmentVariable("SOBERTUNER_SKYBOX_BACKUP_DIR");
    if (!configOverride.isEmpty()) m_configPath = configOverride;
    if (!tunerOverride.isEmpty()) m_tunerPath = tunerOverride;
    if (!cursorOverride.isEmpty()) m_cursorPath = cursorOverride;
    if (!skyboxOverride.isEmpty()) m_skyboxDirectory = skyboxOverride;
    if (!skyboxBackupOverride.isEmpty()) m_skyboxBackupDirectory = skyboxBackupOverride;
}

QString ConfigStore::configPath() const { return m_configPath; }
QString ConfigStore::tunerPath() const { return m_tunerPath; }
QString ConfigStore::cursorPath() const { return m_cursorPath; }
QString ConfigStore::backupDirectory() const { return QFileInfo(m_configPath).absolutePath(); }
QString ConfigStore::cursorBackupPath() const { return m_cursorPath + QStringLiteral(".bak"); }
QString ConfigStore::skyboxDirectory() const { return m_skyboxDirectory; }
QString ConfigStore::skyboxBackupDirectory() const { return m_skyboxBackupDirectory; }
QString ConfigStore::skyboxManifestPath() const { return QDir(m_skyboxBackupDirectory).filePath(QStringLiteral("manifest.json")); }
QString ConfigStore::skyboxMarkerPath() const { return QDir(m_skyboxBackupDirectory).filePath(QStringLiteral("active")); }

bool ConfigStore::parseJsonWithComments(const QByteArray& bytes, QJsonObject* object, QString* error)
{
    QByteArray cleaned;
    cleaned.reserve(bytes.size());

    bool inString = false;
    bool escaped = false;
    bool lineComment = false;
    bool blockComment = false;

    qsizetype start = 0;
    if (bytes.startsWith(QByteArray::fromHex("efbbbf"))) start = 3;
    for (qsizetype i = start; i < bytes.size(); ++i) {
        const char c = bytes.at(i);
        const char next = i + 1 < bytes.size() ? bytes.at(i + 1) : '\0';

        if (lineComment) {
            if (c == '\n' || c == '\r') {
                lineComment = false;
                cleaned.append(c);
            }
            continue;
        }
        if (blockComment) {
            if (c == '*' && next == '/') {
                blockComment = false;
                cleaned.append(' ');
                ++i;
            } else if (c == '\n' || c == '\r') {
                cleaned.append(c);
            } else {
                cleaned.append(' ');
            }
            continue;
        }
        if (inString) {
            cleaned.append(c);
            if (escaped) {
                escaped = false;
            } else if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                inString = false;
            }
            continue;
        }

        if (c == '"') {
            inString = true;
            cleaned.append(c);
        } else if (c == '/' && next == '/') {
            lineComment = true;
            ++i;
        } else if (c == '/' && next == '*') {
            blockComment = true;
            cleaned.append(' ');
            ++i;
        } else {
            cleaned.append(c);
        }
    }

    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(cleaned, &parseError);
    if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
        if (error) {
            *error = parseError.error == QJsonParseError::NoError
                ? QStringLiteral("Expected a JSON object")
                : QStringLiteral("Invalid Sober config at byte %1: %2")
                    .arg(parseError.offset).arg(parseError.errorString());
        }
        return false;
    }
    if (object) *object = document.object();
    return true;
}

bool ConfigStore::loadConfig(QJsonObject* config, QString* error) const
{
    QFile file(m_configPath);
    if (!file.open(QIODevice::ReadOnly)) {
        if (error) *error = messageForFileError(QStringLiteral("Could not read"), m_configPath, file.errorString());
        return false;
    }
    return parseJsonWithComments(file.readAll(), config, error);
}

bool ConfigStore::saveConfig(const QJsonObject& config, QString* error) const
{
    return writeAtomically(m_configPath, serializeObject(config), error);
}

bool ConfigStore::createBackup(QString* createdPath, QString* error) const
{
    if (!QFileInfo::exists(m_configPath)) {
        if (error) *error = QStringLiteral("Sober config does not exist yet: %1").arg(m_configPath);
        return false;
    }
    const QString directory = backupDirectory();
    if (!QDir().mkpath(directory)) {
        if (error) *error = QStringLiteral("Could not create backup directory: %1").arg(directory);
        return false;
    }
    const QString stamp = QDateTime::currentDateTimeUtc().toString(QStringLiteral("yyyy-MM-ddTHH-mm-ss-zzz"));
    QString filename = QStringLiteral("config.backup.%1.json").arg(stamp);
    QString destination = QDir(directory).filePath(filename);
    int suffix = 1;
    while (QFileInfo::exists(destination)) {
        filename = QStringLiteral("config.backup.%1-%2.json").arg(stamp).arg(suffix++);
        destination = QDir(directory).filePath(filename);
    }
    if (!QFile::copy(m_configPath, destination)) {
        if (error) *error = QStringLiteral("Could not create backup at %1").arg(destination);
        return false;
    }
    if (createdPath) *createdPath = destination;
    return true;
}

QStringList ConfigStore::listBackups(QString* error) const
{
    QDir directory(backupDirectory());
    if (!directory.exists()) return {};
    const QStringList names = directory.entryList(
        {QStringLiteral("config.backup.*.json")}, QDir::Files | QDir::Readable, QDir::Name | QDir::Reversed);
    if (error) error->clear();
    return names;
}

bool ConfigStore::restoreBackup(const QString& filename, QJsonObject* restoredConfig, QString* error) const
{
    if (filename.isEmpty() || filename.contains('/') || filename.contains('\\') ||
        QFileInfo(filename).fileName() != filename || !filename.startsWith(QStringLiteral("config.backup.")) ||
        !filename.endsWith(QStringLiteral(".json"))) {
        if (error) *error = QStringLiteral("That is not a valid Sober backup filename");
        return false;
    }
    const QString sourcePath = QDir(backupDirectory()).filePath(filename);
    const QFileInfo sourceInfo(sourcePath);
    if (!sourceInfo.exists() || !sourceInfo.isFile() || sourceInfo.isSymLink()) {
        if (error) *error = QStringLiteral("Backup not found: %1").arg(filename);
        return false;
    }

    QFile source(sourcePath);
    if (!source.open(QIODevice::ReadOnly)) {
        if (error) *error = messageForFileError(QStringLiteral("Could not read backup"), sourcePath, source.errorString());
        return false;
    }
    const QByteArray bytes = source.readAll();
    QJsonObject parsed;
    if (!parseJsonWithComments(bytes, &parsed, error)) return false;
    if (!writeAtomically(m_configPath, bytes, error)) return false;
    if (restoredConfig) *restoredConfig = parsed;
    return true;
}

bool ConfigStore::loadTunerConfig(QJsonObject* config, QString* error) const
{
    if (!QFileInfo::exists(m_tunerPath)) {
        if (config) *config = {};
        if (error) error->clear();
        return true;
    }
    QFile file(m_tunerPath);
    if (!file.open(QIODevice::ReadOnly)) {
        if (error) *error = messageForFileError(QStringLiteral("Could not read"), m_tunerPath, file.errorString());
        return false;
    }
    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(file.readAll(), &parseError);
    if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
        if (error) *error = QStringLiteral("Invalid tuner settings: %1").arg(parseError.errorString());
        return false;
    }
    if (config) *config = document.object();
    if (error) error->clear();
    return true;
}

bool ConfigStore::saveTunerConfig(const QJsonObject& config, QString* error) const
{
    return writeAtomically(m_tunerPath, QJsonDocument(config).toJson(QJsonDocument::Indented), error);
}

bool ConfigStore::hasCursor() const { return QFileInfo::exists(m_cursorPath); }
bool ConfigStore::hasCursorBackup() const { return QFileInfo::exists(cursorBackupPath()); }

QImage ConfigStore::loadCursorPreview(QString* error) const
{
    QImageReader reader(m_cursorPath, "png");
    reader.setAutoTransform(true);
    const QImage image = reader.read();
    if (image.isNull() && error) *error = reader.errorString();
    return image;
}

bool ConfigStore::installCursor(const QString& sourcePath, QString* error)
{
    QImageReader reader(sourcePath);
    reader.setAutoTransform(true);
    const QImage image = reader.read();
    if (image.isNull()) {
        if (error) *error = QStringLiteral("Could not read image: %1").arg(reader.errorString());
        return false;
    }

    QByteArray pngBytes;
    QBuffer buffer(&pngBytes);
    if (!buffer.open(QIODevice::WriteOnly)) {
        if (error) *error = QStringLiteral("Could not prepare PNG conversion");
        return false;
    }
    QImageWriter writer(&buffer, "png");
    if (!writer.write(image)) {
        if (error) *error = QStringLiteral("Could not convert image to PNG: %1").arg(writer.errorString());
        return false;
    }

    const QFileInfo targetInfo(m_cursorPath);
    if (!QDir().mkpath(targetInfo.absolutePath())) {
        if (error) *error = QStringLiteral("Could not create Sober asset overlay directory");
        return false;
    }
    if (QFileInfo::exists(m_cursorPath)) {
        const QString backup = cursorBackupPath();
        if (QFileInfo::exists(backup) && !QFile::remove(backup)) {
            if (error) *error = QStringLiteral("Could not replace the existing cursor backup");
            return false;
        }
        if (!QFile::copy(m_cursorPath, backup)) {
            if (error) *error = QStringLiteral("Could not back up the current shift-lock cursor");
            return false;
        }
    }
    return writeAtomically(m_cursorPath, pngBytes, error);
}

bool ConfigStore::removeCursor(QString* error) const
{
    if (!QFileInfo::exists(m_cursorPath)) return true;
    if (!QFile::remove(m_cursorPath)) {
        if (error) *error = QStringLiteral("Could not remove the custom shift-lock cursor");
        return false;
    }
    return true;
}

bool ConfigStore::restoreCursor(QString* error) const
{
    const QString backup = cursorBackupPath();
    if (!QFileInfo::exists(backup)) {
        if (error) *error = QStringLiteral("No previous cursor backup exists");
        return false;
    }
    QImageReader reader(backup, "png");
    if (reader.read().isNull()) {
        if (error) *error = QStringLiteral("The saved cursor backup is not a valid PNG");
        return false;
    }
    QFile source(backup);
    if (!source.open(QIODevice::ReadOnly)) {
        if (error) *error = messageForFileError(QStringLiteral("Could not read"), backup, source.errorString());
        return false;
    }
    return writeAtomically(m_cursorPath, source.readAll(), error);
}

QStringList ConfigStore::skyboxFaceKeys()
{
    return {
        QStringLiteral("bk"), QStringLiteral("dn"), QStringLiteral("ft"),
        QStringLiteral("lf"), QStringLiteral("rt"), QStringLiteral("up")
    };
}

bool ConfigStore::hasCustomSkybox() const
{
    return QFileInfo::exists(skyboxMarkerPath());
}

bool ConfigStore::hasSkyboxBackup() const
{
    return QFileInfo::exists(skyboxManifestPath());
}

bool ConfigStore::installSkyboxImages(const QMap<QString, QString>& faceImages, QString* error,
                                      const std::function<void(int, int)>& progress)
{
    const QStringList faces = skyboxFaceKeys();
    if (faceImages.size() != faces.size()) {
        if (error) *error = QStringLiteral("Choose one image for each of the six sky faces.");
        return false;
    }
    for (const QString& face : faces) {
        if (!faceImages.contains(face)) {
            if (error) *error = QStringLiteral("The skybox is missing the '%1' face.").arg(face);
            return false;
        }
    }

    const QString etc1tool = findEtc1Tool();
    if (etc1tool.isEmpty()) {
        if (error) *error = QStringLiteral(
            "The Android etc1tool encoder was not found. Install Android SDK platform-tools or set "
            "SOBERTRAP_ETC1TOOL_PATH to the etc1tool executable.");
        return false;
    }

    QTemporaryDir temporary;
    if (!temporary.isValid()) {
        if (error) *error = QStringLiteral("Could not create a temporary folder for sky texture conversion.");
        return false;
    }

    QMap<QString, QByteArray> encodedTextures;
    constexpr int mipLevels = 11;
    constexpr int totalWork = 6 * mipLevels;
    int completed = 0;
    static const uchar ktxIdentifier[] = {
        0xAB, 'K', 'T', 'X', ' ', '1', '1', 0xBB, 0x0D, 0x0A, 0x1A, 0x0A
    };

    for (const QString& face : faces) {
        QImageReader reader(faceImages.value(face));
        reader.setAutoTransform(true);
        QImage sourceImage = reader.read();
        if (sourceImage.isNull()) {
            if (error) *error = QStringLiteral("Could not read the %1 sky image: %2")
                .arg(face, reader.errorString());
            return false;
        }
        if (sourceImage.width() != sourceImage.height()) {
            if (error) *error = QStringLiteral("The %1 sky face must be square (received %2×%3).")
                .arg(face).arg(sourceImage.width()).arg(sourceImage.height());
            return false;
        }
        if (sourceImage.width() < 4 || sourceImage.width() > 8192) {
            if (error) *error = QStringLiteral("The %1 sky face must be between 4×4 and 8192×8192 pixels.").arg(face);
            return false;
        }

        QImage mipImage = sourceImage.convertToFormat(QImage::Format_RGB32)
            .scaled(1024, 1024, Qt::IgnoreAspectRatio, Qt::SmoothTransformation);
        QByteArray ktx;
        ktx.reserve(700000);
        ktx.append(reinterpret_cast<const char*>(ktxIdentifier), sizeof(ktxIdentifier));
        appendU32LittleEndian(ktx, 0x04030201); // KTX endianness marker
        appendU32LittleEndian(ktx, 0);          // glType: compressed texture
        appendU32LittleEndian(ktx, 1);          // glTypeSize
        appendU32LittleEndian(ktx, 0);          // glFormat: compressed texture
        appendU32LittleEndian(ktx, 0x8D64);     // GL_ETC1_RGB8_OES
        appendU32LittleEndian(ktx, 0x1907);     // GL_RGB
        appendU32LittleEndian(ktx, 1024);       // pixel width
        appendU32LittleEndian(ktx, 1024);       // pixel height
        appendU32LittleEndian(ktx, 0);          // pixel depth
        appendU32LittleEndian(ktx, 0);          // array elements
        appendU32LittleEndian(ktx, 1);          // faces
        appendU32LittleEndian(ktx, mipLevels);  // mipmap levels
        appendU32LittleEndian(ktx, 0);          // key/value data bytes

        int mipDimension = 1024;
        for (int level = 0; level < mipLevels; ++level) {
            const int encodedDimension = qMax(4, mipDimension);
            const QImage encodedImage = mipDimension == encodedDimension
                ? mipImage
                : mipImage.scaled(encodedDimension, encodedDimension,
                                  Qt::IgnoreAspectRatio, Qt::SmoothTransformation);
            const QString stem = QStringLiteral("%1-mip-%2").arg(face).arg(level);
            const QString pngPath = temporary.filePath(stem + QStringLiteral(".png"));
            const QString etcPath = temporary.filePath(stem + QStringLiteral(".etc1"));
            if (!encodedImage.save(pngPath, "PNG")) {
                if (error) *error = QStringLiteral("Could not prepare the %1 sky image for ETC1 conversion.").arg(face);
                return false;
            }

            QProcess process;
            process.start(etc1tool, {pngPath, QStringLiteral("--encodeNoHeader"),
                                     QStringLiteral("-o"), etcPath});
            if (!process.waitForStarted(5000)) {
                if (error) *error = QStringLiteral("Could not start etc1tool: %1").arg(process.errorString());
                return false;
            }
            if (!process.waitForFinished(60000)) {
                process.kill();
                process.waitForFinished();
                if (error) *error = QStringLiteral("ETC1 conversion timed out for the %1 sky face.").arg(face);
                return false;
            }
            if (process.exitStatus() != QProcess::NormalExit || process.exitCode() != 0) {
                const QString detail = QString::fromLocal8Bit(process.readAllStandardError()).trimmed();
                if (error) *error = QStringLiteral("ETC1 conversion failed for %1: %2")
                    .arg(face, detail.isEmpty() ? process.errorString() : detail);
                return false;
            }

            QFile encodedFile(etcPath);
            if (!encodedFile.open(QIODevice::ReadOnly)) {
                if (error) *error = QStringLiteral("Could not read ETC1 output for the %1 sky face.").arg(face);
                return false;
            }
            const QByteArray encodedBytes = encodedFile.readAll();
            const quint32 blocksPerSide = static_cast<quint32>((encodedDimension + 3) / 4);
            const quint32 expectedBytes = blocksPerSide * blocksPerSide * 8;
            if (static_cast<quint32>(encodedBytes.size()) != expectedBytes) {
                if (error) *error = QStringLiteral("etc1tool produced an invalid mip level for the %1 sky face.").arg(face);
                return false;
            }
            appendU32LittleEndian(ktx, expectedBytes);
            ktx.append(encodedBytes);
            while (ktx.size() % 4) ktx.append('\0');

            ++completed;
            if (progress) progress(completed, totalWork);
            if (level + 1 < mipLevels) {
                mipDimension = qMax(1, mipDimension / 2);
                mipImage = mipImage.scaled(mipDimension, mipDimension,
                                           Qt::IgnoreAspectRatio, Qt::SmoothTransformation);
            }
        }
        encodedTextures.insert(face, ktx);
    }
    return installSkyboxTextures(encodedTextures, error);
}

bool ConfigStore::installSkyboxTextures(const QMap<QString, QByteArray>& faceTextures, QString* error)
{
    const QStringList faces = skyboxFaceKeys();
    if (faceTextures.size() != faces.size()) {
        if (error) *error = QStringLiteral("A skybox must contain exactly six face textures.");
        return false;
    }
    static const QByteArray ktxIdentifier = QByteArray::fromHex("ab4b5458203131bb0d0a1a0a");
    for (const QString& face : faces) {
        const QByteArray texture = faceTextures.value(face);
        if (texture.size() < 64 || !texture.startsWith(ktxIdentifier) ||
            readU32LittleEndian(texture, 28) != 0x8D64 ||
            readU32LittleEndian(texture, 36) != readU32LittleEndian(texture, 40) ||
            readU32LittleEndian(texture, 52) != 1) {
            if (error) *error = QStringLiteral("The %1 face is not a valid square ETC1 KTX texture.").arg(face);
            return false;
        }
    }

    if (hasCustomSkybox() && !hasSkyboxBackup()) {
        if (error) *error = QStringLiteral("The existing sky texture backup is missing; restore or inspect it before replacing the active skybox.");
        return false;
    }
    if (!hasSkyboxBackup()) {
        if (!QDir().mkpath(m_skyboxBackupDirectory)) {
            if (error) *error = QStringLiteral("Could not create the skybox backup directory.");
            return false;
        }
        for (const QString& face : faces) QFile::remove(QDir(m_skyboxBackupDirectory).filePath(skyboxFilename(face)));
        QFile::remove(skyboxManifestPath());
        QJsonObject originals;
        for (const QString& face : faces) {
            const QString filename = skyboxFilename(face);
            const QString target = QDir(m_skyboxDirectory).filePath(filename);
            const QFileInfo targetInfo(target);
            const bool exists = targetInfo.exists();
            if (targetInfo.isSymLink()) {
                for (const QString& savedFace : faces) QFile::remove(QDir(m_skyboxBackupDirectory).filePath(skyboxFilename(savedFace)));
                if (error) *error = QStringLiteral("Refusing to replace a linked sky texture: %1").arg(target);
                return false;
            }
            originals.insert(filename, exists);
            if (exists && !QFile::copy(target, QDir(m_skyboxBackupDirectory).filePath(filename))) {
                for (const QString& savedFace : faces) QFile::remove(QDir(m_skyboxBackupDirectory).filePath(skyboxFilename(savedFace)));
                if (error) *error = QStringLiteral("Could not back up the existing sky texture: %1").arg(filename);
                return false;
            }
        }
        const QJsonObject manifest{{QStringLiteral("originals"), originals}};
        if (!writeAtomically(skyboxManifestPath(), QJsonDocument(manifest).toJson(QJsonDocument::Indented), error)) {
            for (const QString& face : faces) QFile::remove(QDir(m_skyboxBackupDirectory).filePath(skyboxFilename(face)));
            return false;
        }
    }

    if (!QDir().mkpath(m_skyboxDirectory)) {
        if (error) *error = QStringLiteral("Could not create the Sober sky texture overlay directory.");
        return false;
    }
    for (const QString& face : faces) {
        const QString target = QDir(m_skyboxDirectory).filePath(skyboxFilename(face));
        if (!writeAtomically(target, faceTextures.value(face), error)) {
            QString rollbackError;
            restoreSkybox(&rollbackError);
            if (error && !rollbackError.isEmpty()) *error += QStringLiteral(" Rollback also failed: %1").arg(rollbackError);
            return false;
        }
    }
    if (!writeAtomically(skyboxMarkerPath(), QByteArray("SoberTrap custom skybox active\n"), error)) {
        QString rollbackError;
        restoreSkybox(&rollbackError);
        if (error && !rollbackError.isEmpty()) *error += QStringLiteral(" Rollback also failed: %1").arg(rollbackError);
        return false;
    }
    return true;
}

bool ConfigStore::restoreSkybox(QString* error) const
{
    QFile manifestFile(skyboxManifestPath());
    if (!manifestFile.open(QIODevice::ReadOnly)) {
        if (error) *error = QStringLiteral("No saved original sky textures are available to restore.");
        return false;
    }
    QJsonParseError parseError;
    const QJsonDocument manifestDocument = QJsonDocument::fromJson(manifestFile.readAll(), &parseError);
    if (parseError.error != QJsonParseError::NoError || !manifestDocument.isObject()) {
        if (error) *error = QStringLiteral("The skybox backup manifest is invalid: %1").arg(parseError.errorString());
        return false;
    }
    const QJsonObject originals = manifestDocument.object().value(QStringLiteral("originals")).toObject();
    for (const QString& face : skyboxFaceKeys()) {
        const QString filename = skyboxFilename(face);
        const QString target = QDir(m_skyboxDirectory).filePath(filename);
        if (originals.value(filename).toBool(false)) {
            QFile backup(QDir(m_skyboxBackupDirectory).filePath(filename));
            if (!backup.open(QIODevice::ReadOnly)) {
                if (error) *error = QStringLiteral("The saved original sky texture is missing: %1").arg(filename);
                return false;
            }
            if (!writeAtomically(target, backup.readAll(), error)) return false;
        } else if (QFileInfo::exists(target) && !QFile::remove(target)) {
            if (error) *error = QStringLiteral("Could not remove the custom sky texture: %1").arg(filename);
            return false;
        }
    }

    QFile::remove(skyboxMarkerPath());
    QFile::remove(skyboxManifestPath());
    for (const QString& face : skyboxFaceKeys()) QFile::remove(QDir(m_skyboxBackupDirectory).filePath(skyboxFilename(face)));
    QDir().rmdir(m_skyboxBackupDirectory);
    return true;
}
