#include "main_window.h"

#include <QApplication>
#include <QCoreApplication>
#include <QStyleFactory>

int main(int argc, char* argv[])
{
    QApplication app(argc, argv);
    QCoreApplication::setApplicationName(QStringLiteral("SoberTrap"));
    QCoreApplication::setOrganizationName(QStringLiteral("SoberTrap"));
    QCoreApplication::setApplicationVersion(QStringLiteral(SOBERTRAP_VERSION));
    // Use the platform default style (Breeze, Adwaita, etc.) for a native look.

    MainWindow window;
    window.show();
    return app.exec();
}
