echo COMPILING HELPER

mkdir ./build
swiftc MineCamHelper.swift -target x86_64-apple-macos10.15 -o ./build/MineCamHelper_x86_64
swiftc MineCamHelper.swift -target arm64-apple-macos10.15 -o ./build/MineCamHelper_arm64
lipo -create ./build/MineCamHelper_arm64 ./build/MineCamHelper_x86_64 -output ./build/MineCamHelper

rm ./../MineCam/src/main/resources/assets/minecam/MineCamHelper
cp ./build/MineCamHelper ./../MineCam/src/main/resources/assets/minecam/MineCamHelper

rm -rf ./build

echo FINISHED COMPILING HELPER