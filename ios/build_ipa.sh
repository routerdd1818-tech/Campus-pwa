#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$PROJECT_DIR/ipa_build"
OUTPUT_IPA="$PROJECT_DIR/Campus_v1.ipa"

echo "🐾 正在編譯 Campus v1 (iOS 真機版) 供 SideStore / AltStore 安裝..."
rm -rf "$BUILD_DIR" "$OUTPUT_IPA"

xcodebuild \
  -project "$PROJECT_DIR/Campus v1.xcodeproj" \
  -scheme "Campus v1" \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath "$BUILD_DIR" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  build

APP_PATH=$(find "$BUILD_DIR/Build/Products/Release-iphoneos" -name "Campus v1.app" -maxdepth 1 | head -n 1)

if [ -z "$APP_PATH" ]; then
  echo "❌ 找不到編譯完成的 Campus v1.app"
  exit 1
fi

echo "📦 正在打包成 Campus_v1.ipa ..."
mkdir -p "$BUILD_DIR/Payload"
cp -R "$APP_PATH" "$BUILD_DIR/Payload/"
cd "$BUILD_DIR"
zip -qr "$OUTPUT_IPA" Payload

cd "$PROJECT_DIR"
rm -rf "$BUILD_DIR"

echo "✅ 打包完成！檔案位置："
echo "👉 $OUTPUT_IPA"
echo "你可以直接將 Campus_v1.ipa 透過 AirDrop 傳到 iPhone，並在 SideStore 中點選「+」安裝！"
