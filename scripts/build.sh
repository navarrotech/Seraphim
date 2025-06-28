#!/bin/bash

yarn workspaces run build

# Copy frontend/dist to electron/public/browser
rm -rf electron/public/browser
cp -r frontend/dist electron/public/browser

echo " "
echo -e "\e[32m✔ Built & copied frontend/dist to electron/public/browser\e[0m"
