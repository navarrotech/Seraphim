#!/bin/bash

# Usage:
# yarn testdrive
# yarn testdrive compile

# If the electron binary doesn't exist...
# OR if the arg passed in is "compile"
# Then run the compile script
if [ ! -f "electron/out/electron-linux-x64/electron" ] || [ "$1" == "compile" ]; then
  echo "Compiling electron binary..."
  yarn compile:deb
else
  echo "Electron executable already exists, no need to re-compile."
fi

# If the owner is not root OR the permissions are not set to 4755:
if [ "$(stat -c '%U' electron/out/electron-linux-x64/chrome-sandbox)" != "root" ] || [ "$(stat -c '%a' electron/out/electron-linux-x64/chrome-sandbox)" != "4755" ]; then
  echo " "
  echo "Please enter your password to set permissions for the electron sandbox:"
  sudo chown root electron/out/electron-linux-x64/chrome-sandbox
  sudo chmod 4755 electron/out/electron-linux-x64/chrome-sandbox
else
  echo "Electron sandbox permissions are already set correctly."
fi

echo " "
echo "Electron application logs:"
( cd electron/out/electron-linux-x64 && ./electron )
