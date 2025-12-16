#!/bin/bash
# 推送代码到 GitHub 仓库 transformer_vision
# 使用方法：bash PUSH_TO_GITHUB.sh

# 请将 YOUR_USERNAME 替换为你的 GitHub 用户名
GITHUB_USERNAME="yorkInvalid"
REPO_NAME="transformer_vision"

echo "添加远程仓库..."
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo "推送代码到 GitHub..."
git push -u origin main

echo "完成！代码已推送到 https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"

