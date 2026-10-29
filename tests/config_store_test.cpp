#include "config_store.h"

#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QImage>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMap>
#include <QStandardPaths>
#include <QTemporaryDir>

#include <iostream>

namespace {
bool require(bool condition, const char* message)
{
    if (!condition) std::cerr << "FAIL: " << message << '\n';
    return condition;
}

void appendU32(QByteArray& bytes, quint32 value)
{
    bytes.append(static_cast<char>(value & 0xff));
    bytes.append(static_cast<char>((value >> 8) & 0xff));
    bytes.append(static_cast<char>((value >> 16) & 0xff));
    bytes.append(static_cast<char>((value >> 24) & 0xff));
}

QByteArray testKtx(uchar seed)
{
    QByteArray bytes = QByteArray::fromHex("ab4b5458203131bb0d0a1a0a");
    appendU32(bytes, 0x04030201);
    appendU32(bytes, 0);
    appendU32(bytes, 1);
    appendU32(bytes, 0);
    appendU32(bytes, 0x8D64);
    appendU32(bytes, 0x1907);
    appendU32(bytes, 4);
    appendU32(bytes, 4);
    appendU32(bytes, 0);
    appendU32(bytes, 0);
    appendU32(bytes, 1);
    appendU32(bytes, 1);
    appendU32(bytes, 0);
    appendU32(bytes, 8);
    bytes.append(QByteArray(8, static_cast<char>(seed)));
    return bytes;
}
}

int main(int argc, char** argv)
{
    QCoreApplication app(argc, argv);
    QTemporaryDir home;
    if (!require(home.isValid(), "temporary home directory is available")) return 1;
    ConfigStore store(home.path());

    QDir().mkpath(QFileInfo(store.configPath()).absolutePath());
    QFile fixture(store.configPath());
    if (!require(fixture.open(QIODevice::WriteOnly), "fixture config can be written")) return 1;
    fixture.write(QByteArray::fromHex("efbbbf") + "// Sober config comment\n{\n"
                  "  \"fflags\": { \"ExampleFlag\": true, \"Endpoint\": \"https://example.test/path\" },\n"
                  "  /* block comment */ \"unknownSetting\": { \"keep\": 7 }\n"
                  "}\n");
    fixture.close();

    QJsonObject config;
    QString error;
    if (!require(store.loadConfig(&config, &error), "comments and URL strings parse")) {
        std::cerr << error.toStdString() << '\n';
        return 1;
    }
    if (!require(config.value(QStringLiteral("fflags")).toObject()
                     .value(QStringLiteral("Endpoint")).toString() == QStringLiteral("https://example.test/path"),
                 "URL text is preserved")) return 1;
    if (!require(config.value(QStringLiteral("unknownSetting")).toObject()
                     .value(QStringLiteral("keep")).toInt() == 7,
                 "unknown config fields are preserved")) return 1;

    QJsonObject flags = config.value(QStringLiteral("fflags")).toObject();
    flags.insert(QStringLiteral("AddedByTest"), 42);
    config.insert(QStringLiteral("fflags"), flags);
    if (!require(store.saveConfig(config, &error), "config saves atomically")) {
        std::cerr << error.toStdString() << '\n';
        return 1;
    }

    QString backupPath;
    if (!require(store.createBackup(&backupPath, &error), "backup can be created")) {
        std::cerr << error.toStdString() << '\n';
        return 1;
    }
    if (!require(!store.listBackups().isEmpty(), "backup listing returns the new backup")) return 1;

    QJsonObject changed{{QStringLiteral("fflags"), QJsonObject{{QStringLiteral("Replaced"), true}}}};
    if (!require(store.saveConfig(changed, &error), "temporary config can be replaced")) return 1;
    QJsonObject restored;
    if (!require(store.restoreBackup(QFileInfo(backupPath).fileName(), &restored, &error),
                 "valid backup restores")) {
        std::cerr << error.toStdString() << '\n';
        return 1;
    }
    if (!require(restored.value(QStringLiteral("fflags")).toObject()
                     .value(QStringLiteral("AddedByTest")).toInt() == 42,
                 "restored backup contains saved flags")) return 1;
    if (!require(!store.restoreBackup(QStringLiteral("../outside.json"), nullptr, &error),
                 "backup traversal is rejected")) return 1;

    QJsonObject tuner;
    if (!require(store.loadTunerConfig(&tuner, &error), "missing tuner config defaults to empty")) return 1;
    tuner.insert(QStringLiteral("skyboxAssetId"), QStringLiteral("159649026"));
    tuner.insert(QStringLiteral("profiles"), QJsonArray{QJsonObject{{QStringLiteral("name"), QStringLiteral("Test")}}});
    if (!require(store.saveTunerConfig(tuner, &error), "tuner config saves")) return 1;
    QJsonObject loadedTuner;
    if (!require(store.loadTunerConfig(&loadedTuner, &error) && loadedTuner == tuner,
                 "tuner settings round-trip")) return 1;

    QImage original(8, 8, QImage::Format_ARGB32);
    original.fill(Qt::red);
    const QString sourcePath = QDir(home.path()).filePath(QStringLiteral("source.jpg"));
    if (!require(original.save(sourcePath, "JPEG"), "test image can be written")) return 1;
    if (!require(store.installCursor(sourcePath, &error), "JPEG converts to overlay PNG")) {
        std::cerr << error.toStdString() << '\n';
        return 1;
    }
    if (!require(store.hasCursor(), "custom cursor file is installed")) return 1;
    if (!require(!store.loadCursorPreview().isNull(), "installed cursor preview decodes")) return 1;
    if (!require(store.installCursor(sourcePath, &error) && store.hasCursorBackup(),
                 "replacing an image creates a recoverable backup")) return 1;
    if (!require(store.removeCursor(&error) && !store.hasCursor() && store.hasCursorBackup(),
                 "remove restores default and keeps the previous image available")) return 1;
    if (!require(store.restoreCursor(&error) && store.hasCursor(), "cursor backup restores")) return 1;

    const QStringList skyFaces = ConfigStore::skyboxFaceKeys();
    QDir().mkpath(store.skyboxDirectory());
    const QString originalFrontPath = QDir(store.skyboxDirectory()).filePath(QStringLiteral("sky512_ft.tex"));
    QFile originalFront(originalFrontPath);
    if (!require(originalFront.open(QIODevice::WriteOnly), "original sky overlay can be written")) return 1;
    originalFront.write("original-front-texture");
    originalFront.close();

    QMap<QString, QByteArray> faceTextures;
    for (qsizetype i = 0; i < skyFaces.size(); ++i) faceTextures.insert(skyFaces.at(i), testKtx(static_cast<uchar>(i + 1)));
    if (!require(store.installSkyboxTextures(faceTextures, &error), "six KTX sky faces install")) {
        std::cerr << error.toStdString() << '\n';
        return 1;
    }
    if (!require(store.hasCustomSkybox() && store.hasSkyboxBackup(), "skybox install records an original backup")) return 1;
    QFile installedFront(originalFrontPath);
    if (!require(installedFront.open(QIODevice::ReadOnly) && installedFront.readAll() == faceTextures.value(QStringLiteral("ft")),
                 "custom front texture replaces the overlay")) return 1;
    installedFront.close();
    if (!require(store.restoreSkybox(&error), "previous sky overlay restores")) {
        std::cerr << error.toStdString() << '\n';
        return 1;
    }
    if (!require(!store.hasCustomSkybox() && !store.hasSkyboxBackup(), "sky restore clears the custom marker and backup")) return 1;
    QFile restoredFront(originalFrontPath);
    if (!require(restoredFront.open(QIODevice::ReadOnly) && restoredFront.readAll() == QByteArray("original-front-texture"),
                 "restore puts the exact previous overlay back")) return 1;
    if (!require(!QFileInfo::exists(QDir(store.skyboxDirectory()).filePath(QStringLiteral("sky512_bk.tex"))),
                 "restore removes faces that were not originally overlaid")) return 1;

    QString etc1Tool = QStandardPaths::findExecutable(QStringLiteral("etc1tool"));
    const QStringList etc1Candidates = {
        QDir::home().filePath(QStringLiteral("Android/Sdk/platform-tools/etc1tool")),
        QDir::home().filePath(QStringLiteral("android-sdk/platform-tools/etc1tool"))
    };
    if (etc1Tool.isEmpty()) {
        for (const QString& candidate : etc1Candidates) {
            if (QFileInfo(candidate).isExecutable()) { etc1Tool = candidate; break; }
        }
    }
    if (!etc1Tool.isEmpty()) {
        qputenv("SOBERTUNER_ETC1TOOL_PATH", etc1Tool.toUtf8());
        QMap<QString, QString> faceImages;
        for (qsizetype i = 0; i < skyFaces.size(); ++i) {
            QImage face(16, 16, QImage::Format_RGB32);
            face.fill(QColor::fromHsv(static_cast<int>(i * 55), 190, 220));
            const QString imagePath = QDir(home.path()).filePath(QStringLiteral("sky-%1.png").arg(skyFaces.at(i)));
            if (!require(face.save(imagePath, "PNG"), "sky face image fixture can be saved")) return 1;
            faceImages.insert(skyFaces.at(i), imagePath);
        }
        if (!require(store.installSkyboxImages(faceImages, &error), "six source images encode to ETC1 KTX")) {
            std::cerr << error.toStdString() << '\n';
            return 1;
        }
        QFile encodedFront(originalFrontPath);
        if (!require(encodedFront.open(QIODevice::ReadOnly), "encoded sky texture can be opened")) return 1;
        const QByteArray encodedKtx = encodedFront.readAll();
        if (!require(encodedKtx.startsWith(QByteArray::fromHex("ab4b5458203131bb0d0a1a0a")), "encoded sky uses KTX1")) return 1;
        if (!require(encodedKtx.size() == 699172, "encoded sky contains 1024px ETC1 mipmaps")) return 1;
        if (!require(store.restoreSkybox(&error), "encoded sky can be rolled back")) return 1;
    }

    std::cout << "ConfigStore tests passed\n";
    return 0;
}
