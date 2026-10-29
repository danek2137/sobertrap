cmake_minimum_required(VERSION 3.21)
project(SoberTrapp VERSION 1.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS Widgets Svg)

add_executable(sobertrapp
    src/main.cpp
    src/main_window.cpp
    src/main_window.h
    src/config_store.cpp
    src/config_store.h
    src/crosshair_overlay.cpp
    src/crosshair_overlay.h
)

target_link_libraries(sobertrapp PRIVATE Qt6::Widgets Qt6::Svg)
target_compile_definitions(sobertrapp PRIVATE SOBERTRAPP_VERSION="${PROJECT_VERSION}")
target_compile_options(sobertrapp PRIVATE -Wall -Wextra -Wpedantic)

include(CTest)
if(BUILD_TESTING)
    add_executable(config_store_test
        tests/config_store_test.cpp
        src/config_store.cpp
        src/config_store.h
    )
    target_include_directories(config_store_test PRIVATE src)
    target_link_libraries(config_store_test PRIVATE Qt6::Widgets)
    add_test(NAME config_store_test COMMAND config_store_test)
endif()

install(TARGETS sobertrapp RUNTIME DESTINATION bin)
