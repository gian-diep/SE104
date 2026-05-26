# Push report github

git add .

git commit -m "Tin nhắn update"

git push origin main

## Push bị conflict
git push origin main --force

## Kéo về máy
git pull origin main

---------

## 1. kéo code mới nhất về frontend/backend (kéo từ dev chứ k kéo từ main)
git checkout tên_branch
git pull origin dev

## sửa xong
git add .
git commit -m "Tin nhắn update"
git push

## 2. merge vào dev
git checkout dev
git pull origin dev

git merge origin/tên_branch
(nếu có hiện cửa sổ MSG thì ctrl+S rồi đóng tab đó là được)

git push origin dev

## 3. push dev lên main
git checkout main
git pull origin main

git merge dev

git push origin main
