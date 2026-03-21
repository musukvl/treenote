#!/bin/bash
# Purpose: Build and publish a macOS release to GitHub and update Homebrew tap.
# Usage: ./release-mac.sh <version> [release-notes-file]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"

VERSION="${1:-}"
RELEASE_NOTES_FILE="${2:-RELEASE_NOTES.md}"

if [[ -z "${VERSION}" ]]; then
	echo -e "${RED}Error: missing version${NC}"
	echo "Usage: $0 <version> [release-notes-file]"
	echo "Example: $0 1.0.3 RELEASE_NOTES.md"
	exit 1
fi

if ! [[ "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo -e "${RED}Error: version must match X.Y.Z${NC}"
	exit 1
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
	echo -e "${RED}Error: macOS release build must be executed on macOS${NC}"
	exit 1
fi

if [[ ! -f "${REPO_ROOT}/${RELEASE_NOTES_FILE}" ]]; then
	echo -e "${RED}Error: release notes file not found: ${RELEASE_NOTES_FILE}${NC}"
	exit 1
fi

for cmd in git gh npm npx node shasum awk find sort; do
	if ! command -v "${cmd}" >/dev/null 2>&1; then
		echo -e "${RED}Error: required command not found: ${cmd}${NC}"
		exit 1
	fi
done

if ! gh auth status >/dev/null 2>&1; then
	echo -e "${RED}Error: GitHub CLI is not authenticated${NC}"
	echo "Run: gh auth login"
	exit 1
fi

cd "${REPO_ROOT}"

if [[ ! -f "electron-builder.yml" ]]; then
	echo -e "${RED}Error: electron-builder.yml is missing${NC}"
	exit 1
fi

if [[ ! -f "resources/icon.icns" ]]; then
	echo -e "${RED}Error: resources/icon.icns is missing${NC}"
	exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
	echo -e "${RED}Error: treenote repository has uncommitted changes${NC}"
	echo "Please commit or stash changes before running release script."
	exit 1
fi

SOURCE_REPO="${SOURCE_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
TAP_REPO_PATH="${TAP_REPO_PATH:-${REPO_ROOT}/../homebrew-treenote}"
TAP_BRANCH="${TAP_BRANCH:-main}"
TAG="v${VERSION}"
DIST_DIR="${REPO_ROOT}/dist"
EXPECTED_DMG_NAME="TreeNote-${VERSION}.dmg"
EXPECTED_DMG_PATH="${DIST_DIR}/${EXPECTED_DMG_NAME}"

if [[ ! -d "${TAP_REPO_PATH}" ]]; then
	echo -e "${RED}Error: tap repository directory not found: ${TAP_REPO_PATH}${NC}"
	exit 1
fi

if [[ ! -d "${TAP_REPO_PATH}/.git" ]]; then
	echo -e "${RED}Error: ${TAP_REPO_PATH} is not a git repository${NC}"
	exit 1
fi

if [[ -n "$(git -C "${TAP_REPO_PATH}" status --porcelain)" ]]; then
	echo -e "${RED}Error: homebrew-treenote repository has uncommitted changes${NC}"
	echo "Please commit or stash tap changes before running release script."
	exit 1
fi

if gh release view "${TAG}" --repo "${SOURCE_REPO}" >/dev/null 2>&1; then
	echo -e "${RED}Error: release ${TAG} already exists in ${SOURCE_REPO}${NC}"
	exit 1
fi

if git ls-remote --tags origin "refs/tags/${TAG}" | grep -q "${TAG}"; then
	echo -e "${RED}Error: remote tag ${TAG} already exists${NC}"
	exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TreeNote macOS Release${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo -e "Tag: ${YELLOW}${TAG}${NC}"
echo -e "Repo: ${YELLOW}${SOURCE_REPO}${NC}"
echo -e "Tap: ${YELLOW}${TAP_REPO_PATH}${NC}"
echo -e "Release notes: ${YELLOW}${RELEASE_NOTES_FILE}${NC}"

CURRENT_VERSION="$(node -p "require('./package.json').version")"
if [[ "${CURRENT_VERSION}" == "${VERSION}" ]]; then
	echo -e "${YELLOW}Warning: package.json already has version ${VERSION}${NC}"
else
	echo -e "${GREEN}Updating package version ${CURRENT_VERSION} -> ${VERSION}${NC}"
	npm version "${VERSION}" --no-git-tag-version
fi

echo -e "${GREEN}Installing dependencies...${NC}"
npm ci

echo -e "${GREEN}Building application...${NC}"
npm run build

echo -e "${GREEN}Packaging macOS DMG...${NC}"
export CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --mac --config electron-builder.yml

if [[ ! -d "${DIST_DIR}" ]]; then
	echo -e "${RED}Error: dist directory not found${NC}"
	exit 1
fi

mapfile -t DMG_CANDIDATES < <(find "${DIST_DIR}" -maxdepth 1 -type f -name "*${VERSION}*.dmg" | sort)
if [[ ${#DMG_CANDIDATES[@]} -eq 0 ]]; then
	mapfile -t DMG_CANDIDATES < <(find "${DIST_DIR}" -maxdepth 1 -type f -name "*.dmg" | sort)
fi
if [[ ${#DMG_CANDIDATES[@]} -eq 0 ]]; then
	echo -e "${RED}Error: no DMG artifact found in ${DIST_DIR}${NC}"
	exit 1
fi

SELECTED_DMG="${DMG_CANDIDATES[0]}"
if [[ "${SELECTED_DMG}" != "${EXPECTED_DMG_PATH}" ]]; then
	echo -e "${GREEN}Normalizing DMG filename to ${EXPECTED_DMG_NAME}${NC}"
	cp "${SELECTED_DMG}" "${EXPECTED_DMG_PATH}"
fi

SHA256="$(shasum -a 256 "${EXPECTED_DMG_PATH}" | awk '{print $1}')"

echo -e "${GREEN}Committing treenote release changes...${NC}"
git add package.json package-lock.json
if [[ -n "$(git status --porcelain)" ]]; then
	git commit -m "release: ${TAG}"
else
	echo -e "${YELLOW}No treenote version file changes detected${NC}"
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo -e "${GREEN}Pushing treenote branch ${CURRENT_BRANCH}...${NC}"
git push origin "${CURRENT_BRANCH}"

echo -e "${GREEN}Creating GitHub release and uploading DMG...${NC}"
gh release create "${TAG}" \
	"${EXPECTED_DMG_PATH}" \
	--repo "${SOURCE_REPO}" \
	--title "Release ${TAG}" \
	--notes-file "${REPO_ROOT}/${RELEASE_NOTES_FILE}" \
	--target "$(git rev-parse HEAD)"

echo -e "${GREEN}Ensuring local tag exists after publish...${NC}"
git fetch origin "refs/tags/${TAG}:refs/tags/${TAG}" --force

echo -e "${GREEN}Updating Homebrew cask...${NC}"
mkdir -p "${TAP_REPO_PATH}/Casks"
cat > "${TAP_REPO_PATH}/Casks/treenote.rb" <<EOF
cask "treenote" do
	version "${VERSION}"
	sha256 "${SHA256}"

	url "https://github.com/${SOURCE_REPO}/releases/download/v#{version}/TreeNote-#{version}.dmg"
	name "TreeNote"
	desc "Hierarchical notes management application"
	homepage "https://github.com/${SOURCE_REPO}"

	app "TreeNote.app"
end
EOF

git -C "${TAP_REPO_PATH}" add Casks/treenote.rb
if [[ -f "${TAP_REPO_PATH}/README.md" ]]; then
	git -C "${TAP_REPO_PATH}" add README.md
fi

if [[ -n "$(git -C "${TAP_REPO_PATH}" status --porcelain)" ]]; then
	git -C "${TAP_REPO_PATH}" commit -m "treenote ${VERSION}"
	git -C "${TAP_REPO_PATH}" push origin "${TAP_BRANCH}"
else
	echo -e "${YELLOW}No Homebrew tap changes detected${NC}"
fi

echo ""
echo -e "${GREEN}Release completed successfully${NC}"
echo "DMG: ${EXPECTED_DMG_PATH}"
echo "SHA256: ${SHA256}"
echo "Release URL: https://github.com/${SOURCE_REPO}/releases/tag/${TAG}"
