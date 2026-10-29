#include <windows.h>
#include <tlhelp32.h>
#include <string>
#include <iostream>
#include <vector>

DWORD GetProcessIdByName(const std::string& processName) {
    DWORD pid = 0;
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32 processEntry;
        processEntry.dwSize = sizeof(processEntry);
        if (Process32First(snapshot, &processEntry)) {
            do {
                if (processName == processEntry.szExeFile) {
                    pid = processEntry.th32ProcessID;
                    break;
                }
            } while (Process32Next(snapshot, &processEntry));
        }
        CloseHandle(snapshot);
    }
    return pid;
}

void ListProcesses() {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32 processEntry;
        processEntry.dwSize = sizeof(processEntry);
        if (Process32First(snapshot, &processEntry)) {
            do {
                std::cout << processEntry.th32ProcessID << "|" << processEntry.szExeFile << std::endl;
            } while (Process32Next(snapshot, &processEntry));
        }
        CloseHandle(snapshot);
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage:" << std::endl;
        std::cerr << "  inject.exe list                   - List running processes" << std::endl;
        std::cerr << "  inject.exe inject <process> <dll> - Inject DLL into process" << std::endl;
        return 1;
    }

    std::string command = argv[1];

    if (command == "list") {
        ListProcesses();
        return 0;
    }

    if (command == "inject") {
        if (argc < 4) {
            std::cerr << "Usage: inject.exe inject <process_name> <dll_path>" << std::endl;
            return 1;
        }

        std::string processName = argv[2];
        std::string dllPath = argv[3];

        DWORD processId = GetProcessIdByName(processName);
        if (processId == 0) {
            std::cerr << "ERROR: Target process not found: " << processName << std::endl;
            return 1;
        }

        HANDLE processHandle = OpenProcess(PROCESS_ALL_ACCESS, FALSE, processId);
        if (!processHandle) {
            std::cerr << "ERROR: Failed to open process. Run as Administrator!" << std::endl;
            return 1;
        }

        size_t dllPathSize = dllPath.length() + 1;
        LPVOID remoteMemory = VirtualAllocEx(processHandle, nullptr, dllPathSize,
                                              MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
        if (!remoteMemory) {
            std::cerr << "ERROR: Failed to allocate memory in target process" << std::endl;
            CloseHandle(processHandle);
            return 1;
        }

        if (!WriteProcessMemory(processHandle, remoteMemory, dllPath.c_str(), dllPathSize, nullptr)) {
            std::cerr << "ERROR: Failed to write DLL path to target process" << std::endl;
            VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
            CloseHandle(processHandle);
            return 1;
        }

        LPVOID loadLibraryAddr = (LPVOID)GetProcAddress(GetModuleHandleA("kernel32.dll"), "LoadLibraryA");
        if (!loadLibraryAddr) {
            std::cerr << "ERROR: Failed to get LoadLibraryA address" << std::endl;
            VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
            CloseHandle(processHandle);
            return 1;
        }

        HANDLE remoteThread = CreateRemoteThread(processHandle, nullptr, 0,
                                                  (LPTHREAD_START_ROUTINE)loadLibraryAddr,
                                                  remoteMemory, 0, nullptr);
        if (!remoteThread) {
            std::cerr << "ERROR: Failed to create remote thread" << std::endl;
            VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
            CloseHandle(processHandle);
            return 1;
        }

        WaitForSingleObject(remoteThread, INFINITE);
        CloseHandle(remoteThread);
        VirtualFreeEx(processHandle, remoteMemory, 0, MEM_RELEASE);
        CloseHandle(processHandle);

        std::cout << "SUCCESS: DLL injected successfully into " << processName << " (PID: " << processId << ")" << std::endl;
        return 0;
    }

    std::cerr << "Unknown command: " << command << std::endl;
    std::cerr << "Usage: inject.exe list|inject" << std::endl;
    return 1;
}
