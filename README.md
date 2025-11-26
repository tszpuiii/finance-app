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
- 後端：Node.js + Express + Mongoose（MongoDB Atlas）、JWT、CORS

## 專案結構
```
finance-app/
├─ client/              # Expo React Native app
└─ server/              # Node/Express API
```

## 快速開始

### 1) 後端（Server）
```powershell
cd server
npm install
Copy-Item env.example .env   # 建立 .env 並填入實際值
npm run dev
```
.env 需要：
```
PORT=3000
MONGODB_URI=你的 Atlas 連線字串
JWT_SECRET=長隨機字串
```
健康檢查：`http://localhost:3000/health` 應回 `{ "status": "ok" }`

### 2) 前端（Client）
```powershell
cd client
npm install
```

#### Android 模擬器（推薦）
```powershell
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:3000/api"
npm run start
# 在 Metro 視窗按 a 開啟模擬器
```
備註：請先用 Android Studio 建立並啟動一台 AVD。若偏好使用 localhost，先執行 `adb reverse tcp:3000 tcp:3000` 再把 EXPO_PUBLIC_API_URL 設為 `http://localhost:3000/api`。

#### 真機（Expo Go）
1) 手機與電腦同一區網，查電腦 IP（如 192.168.1.10）  
2) 前端：
```powershell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.10:3000/api"
npm run start
```
3) 手機安裝「Expo Go」，掃描 QR 進入

#### 只看 UI（Web + Mock 模式）
```powershell
cd client
npx expo install react-dom react-native-web   # 首次用 Web 需要
$env:EXPO_PUBLIC_API_URL="mock"
npm run web
```
Mock 模式會在前端攔截 API 並回傳假資料，方便快速驗收 UI 與流程。

## 常用腳本
- Server：`npm run dev`（nodemon 啟動）
- Client：`npm run start`、`npm run android`、`npm run web`

## 常見問題
- 模擬器白屏/卡載入：
  - `import 'react-native-gesture-handler';` 已加於 `client/App.js` 首行
  - 重新啟動打包器並清快取 `npx expo start -c`
  - 先手動啟動 AVD，再回 Metro 按 `a`
- Android 連不到後端：
  - 模擬器請用 `10.0.2.2`；真機用電腦區網 IP；或執行 `adb reverse` 搭配 `localhost`
- 通知/定位：到系統設定允許 App 權限

## 參考文件
- Expo（React Native）`https://docs.expo.dev/`
- MongoDB Atlas `https://www.mongodb.com/atlas/database`

---

更完整的課程導向建置與分工指南，請見 `docs/COMP4342_Guide.md`。 


