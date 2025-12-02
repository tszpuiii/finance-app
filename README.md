# Personal Finance Manager (COMP4342)

一個可在 Android/iOS 執行的個人財務管理 App，含雲端後端、預算與預測、GPS 與生理辨識、離線同步與本地通知。此倉庫符合 COMP4342 Mobile Computing 的演示需求：可在真機/模擬器運行，並有雲端 API（Node/Express + MongoDB）。

## 功能
- 登入/註冊（JWT），首次成功登入後支援生理辨識快速登入（Expo Local Authentication）
- 支出：新增（含 GPS 反查與類別推測）、刪除、搜尋
- 儀表板：分類圓餅圖、近期清單、下拉刷新
- 預算：設定 ALL/飲食/交通 月預算，顯示當月狀態與比例；新增支出時達 80%/100% 觸發本地通知
- 洞察：日趨勢線與當月預測（平均速度推估）
- 離線佇列：斷網時新增支出會排隊，回到儀表板自動同步
- UI 模擬模式：無需後端與模擬器，直接用 Web 預覽

## 技術堆疊
- 前端：Expo React Native（Navigation、expo-local-authentication、expo-location、victory-native、expo-notifications）
- 後端：Node.js + Express + Mongoose（MongoDB 本地/Atlas）、JWT、CORS

## 專案結構
```
finance-app/
├─ client/              # Expo React Native app
└─ server/              # Node/Express API
```

## 環境設置

### 1. 安裝必要軟件

#### MongoDB Desktop
1. 下載 MongoDB Desktop（MongoDB Compass）：
   - 訪問：https://www.mongodb.com/try/download/compass
   - 下載並安裝適合您系統的版本（Windows/Mac/Linux）
2. 安裝完成後，啟動 MongoDB Desktop
3. 確保 MongoDB 服務正在運行（默認端口：27017）

#### Android Studio
1. 下載 Android Studio：
   - 訪問：https://developer.android.com/studio
   - 下載並安裝 Android Studio
2. 安裝 Android SDK：
   - 打開 Android Studio
   - 進入 Settings/Preferences → Appearance & Behavior → System Settings → Android SDK
   - 確保已安裝 Android SDK Platform 和 Android SDK Build-Tools
3. 創建 Android 虛擬設備（AVD）：
   - 打開 Android Studio
   - 點擊 Tools → Device Manager
   - 點擊 "Create Device"
   - 選擇設備型號（推薦：Pixel 5 或 Pixel 6）
   - 選擇系統映像（推薦：API 33 或更高版本）
   - 完成創建並啟動模擬器

#### Node.js
1. 下載 Node.js（版本 18 或更高）：
   - 訪問：https://nodejs.org/
   - 下載並安裝 LTS 版本

#### Expo Go（真機測試）
1. 在手機上安裝 Expo Go：
   - iOS：從 App Store 下載 "Expo Go"
   - Android：從 Google Play 下載 "Expo Go"

### 2. 獲取本地 IP 地址（真機測試需要）

#### Windows
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Select-Object IPAddress, InterfaceAlias
```
找到您的 Wi-Fi 或以太網適配器的 IP 地址（例如：192.168.1.10）

#### Mac/Linux
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
或
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

## 快速開始

### 步驟 1: 克隆倉庫
```bash
git clone <repository-url>
cd finance-app
```

### 步驟 2: 設置後端服務器

```powershell
cd server
npm install
```

創建 `.env` 文件（如果不存在）：
```powershell
Copy-Item env.example .env
```

`.env` 文件已自動配置為：
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/finance-app
JWT_SECRET=自動生成的隨機字串
```

**使用 MongoDB Atlas（雲端）**：編輯 `server/.env`，將 `MONGODB_URI` 改為你的 Atlas 連線字串。

### 步驟 3: 設置前端

```powershell
cd client
npm install
```

### 步驟 4: 啟動應用

#### 選項 A: Android 模擬器（推薦）

**終端 1 - 啟動後端服務器：**
```powershell
cd server
npm start
```
應該看到：
```
Server running on port 3000
✓ Connected to MongoDB
```

**終端 2 - 啟動前端開發服務器：**
```powershell
cd client
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:3000/api"
npm start
```

**在 Expo 開發服務器終端：**
- 按 `a` 鍵 - 在 Android 模擬器中打開應用
- 按 `r` 鍵 - 重新加載應用
- 按 `m` 鍵 - 切換菜單

**注意**：`10.0.2.2` 是 Android 模擬器訪問主機 localhost 的特殊地址。

#### 選項 B: 真機（iPhone/Android）

**步驟 1: 獲取本地 IP 地址**
- Windows: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"}`
- Mac/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`

**步驟 2: 啟動後端服務器（終端 1）**
```powershell
cd server
npm start
```

**步驟 3: 啟動前端開發服務器（終端 2）**
```powershell
cd client
$env:EXPO_PUBLIC_API_URL="http://YOUR_IP:3000/api"
npm start
```
將 `YOUR_IP` 替換為步驟 1 中獲取的 IP 地址（例如：`192.168.1.10`）

**步驟 4: 在手機上連接**
- 確保手機和電腦連接到同一個 Wi-Fi 網絡
- 打開 Expo Go 應用
- 掃描終端中顯示的 QR 碼
- 或者使用相機應用掃描 QR 碼，然後點擊通知打開 Expo Go

**如果無法連接，可以使用 tunnel 模式：**
```powershell
npx expo start --tunnel
```
（較慢但可以在不同網絡下使用）

#### 選項 C: Web 模式（僅 UI 預覽）

```powershell
cd client
$env:EXPO_PUBLIC_API_URL="mock"
npm run web
```

Mock 模式會在前端攔截 API 並回傳假資料，方便快速驗收 UI 與流程。

## 檢查服務狀態

### 檢查後端服務器
在瀏覽器打開：`http://localhost:3000/health`
應該看到：`{"status":"ok"}`

### 檢查 MongoDB
```powershell
# Windows PowerShell
Test-NetConnection -ComputerName localhost -Port 27017

# Mac/Linux
nc -zv localhost 27017
```

## 常用腳本
- Server：`npm run dev`（nodemon 啟動）
- Client：`npm run start`、`npm run android`、`npm run web`

## 常見問題

### 端口被佔用
如果端口 3000 或 8081 被佔用，可以：
- 停止佔用端口的進程
- 或修改 `server/.env` 中的 `PORT` 設置

### 應用一直加載
1. 檢查後端服務器是否運行
2. 檢查 API URL 是否正確設置
3. 清除緩存：`npx expo start --clear`

### 無法連接到後端
- **Android 模擬器**：使用 `10.0.2.2:3000`
- **真機**：使用電腦的 IP 地址（確保在同一 Wi-Fi 網絡）
- 確保後端服務器正在運行
- 檢查防火牆是否阻止了端口 3000

### 通知/定位權限
- 到系統設定允許 App 權限
- 在 Android 模擬器中，位置服務可能不可用（這是模擬器限制）

### iPhone 動態島遮擋
- 應用已自動處理安全區域，內容不會被動態島遮擋

## 參考文件
- Expo（React Native）：https://docs.expo.dev/
- MongoDB 本地安裝：`server/MONGODB_SETUP.md`
- MongoDB Atlas：https://www.mongodb.com/atlas/database
- Android Studio：https://developer.android.com/studio

---

更完整的課程導向建置與分工指南，請見 `docs/COMP4342_Guide.md`。
