#!/bin/bash

bash ./scripts/build.sh
if [ $? -ne 0 ]; then
  echo "✘ Build failed"
  exit 1
fi

# In case you need to install dependencies for building the electron app:
# sudo apt update -y
# sudo apt install -y build-essential clang libdbus-1-dev libgtk-3-dev \
#   libnotify-dev libasound2-dev libcap-dev \
#   libcups2-dev libxtst-dev libxss1 libnss3-dev \
#   gcc-multilib g++-multilib curl gperf bison \
#   python3-dbusmock openjdk-8-jre fakeroot rpm \
#   libx11-dev libxkbfile-dev libsecret-1-dev

cd electron && yarn make && cd ..

echo " "
echo -e "\e[32m✔ Compiled electron app in electron/out/make/\e[0m"
