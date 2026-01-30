#!/usr/bin/env bash
set -euo pipefail

act_version="${1:-}"
if [[ -z "$act_version" ]]; then
  echo "install-act.sh missing required version argument" >&2
  exit 1
fi

arch="$(uname -m)"
case "$arch" in
  x86_64|amd64)
    act_arch="x86_64"
    ;;
  aarch64|arm64)
    act_arch="arm64"
    ;;
  *)
    echo "Unsupported architecture for act: $arch" >&2
    exit 1
    ;;
esac

act_url="https://github.com/nektos/act/releases/download/v${act_version}/act_Linux_${act_arch}.tar.gz"
echo "Downloading act ${act_version} from ${act_url}"

curl -fsSL "$act_url" -o /tmp/act.tar.gz
tar -xzf /tmp/act.tar.gz -C /usr/local/bin act
chmod +x /usr/local/bin/act
rm /tmp/act.tar.gz

act --version
