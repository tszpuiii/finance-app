# COMP4342 個人財務管理應用程式 — 建置與實作指南

本文件針對 COMP4342 行動運算專案（第 9 組：個人財務管理應用程式）提供一套可落地的建置與實作說明，對應本倉庫的實作。你可以依此完成規劃、開發、整合、測試與演示。

---

## 階段 1：規劃與需求

### 1. 核心功能
- 使用者註冊/登入（JWT），含生理辨識快速登入（Face ID / Touch ID / 指紋）
- 支出追蹤（新增/刪除/搜尋；含類別、金額、日期、位置）
- 預算管理（ALL/分類月預算，當月狀態）
- 洞察（類別比例圖、日趨勢、當月支出預測）
- 基於位置：GPS 反查地點名稱並推測類別（可手動覆寫）
- 離線支援：斷網時把新增支出丟入佇列，上線自動同步
- 本地通知：接近/超過預算門檻時提醒
- 即時同步（加分）：多裝置資料即時更新（本倉庫已保留後端相依，可延伸）

### 2. 任務分解與分工
- 客戶端：畫面/導航、API 串接、GPS/生理辨識、圖表、離線佇列
- 伺服器端：資料模型、JWT、REST API、預算狀態與預測
- 設計/測試：UI 流程、測試案例、演示腳本

### 3. 技術堆疊
- 客戶端：Expo React Native、React Navigation、expo-local-authentication、expo-location、victory-native、expo-notifications、AsyncStorage
- 伺服器端：Node.js、Express、Mongoose（MongoDB Atlas）、JWT、CORS
- 資料表：
  - Users(id, email, passwordHash)
  - Expenses(userId, amount, category, date, location{lat,lng}, note?)
  - Budgets(userId, category['ALL' 或分類], limit, period='monthly')

### 4. UI 畫面（Figma 線框建議）
- Login/Register（含生理辨識快捷）
- Dashboard（圓餅圖、列表、搜尋、操作入口）
- Add Expense（金額/類別/位置顯示/儲存）
- Budget（設定 ALL/飲食/交通）
- Insights（日趨勢與本月預測）

### 5. 安全
- 密碼雜湊（bcrypt）
- JWT + 授權中介層
- 僅在必要時儲存敏感資訊；手機端使用 AsyncStorage 儲存 token

---

## 階段 2：環境設定
- Node.js 18+、npm/yarn
- Expo（`npm i -g expo-cli` 或直接使用 `npx expo`）
- Android Studio（模擬器）或真機（Expo Go）
- MongoDB Atlas（免費叢集）
- GitHub 倉庫版本控制

---

## 階段 3：客戶端實作（已完成對應檔案於 `client/`）

### 1. 導航與畫面
- `App.js`：NavigationContainer + Native Stack（Login/Register/Dashboard/AddExpense/Budget/Insights）
- `screens/`：各頁面實作
- `components/`：`ExpenseItem`、`BudgetChart(victory-native)`

### 2. 驗證與生理辨識
- `utils/api.js`：axios + 攔截器（自動帶入 JWT）
- `utils/auth.js`：儲存/取得/清除 token
- `utils/biometric.js`：偵測硬體/指紋註冊、啟動生理辨識快速登入（成功後導向 Dashboard）

### 3. 支出與 GPS
- `AddExpenseScreen`：要求定位權限、抓取座標、反查地點，根據地點字串推測類別（餐飲/交通/購物等關鍵字），送出到 `/api/expenses`

### 4. 儀表板與圖表
- `DashboardScreen`：載入 `/api/expenses`，做分類加總給 `BudgetChart`（圓餅圖），列表支援搜尋與刪除

### 5. 離線佇列與同步
- `utils/sync.js`：離線新增支出寫入 AsyncStorage 佇列；回到 Dashboard 嘗試 `syncPendingExpenses()`

### 6. 本地通知
- `utils/notifications.js`：新增支出時若達 80%/100% 預算門檻，排程本地通知提示

### 7. UI 模擬模式（Web 預覽）
- 把 `EXPO_PUBLIC_API_URL` 設成 `mock`，`utils/api.js` 會攔截 API 並回傳假資料。用法：
```powershell
cd client
npx expo install react-dom react-native-web
$env:EXPO_PUBLIC_API_URL="mock"
npm run web
```

---

## 階段 4：伺服器端實作（已完成對應檔案於 `server/`）

### 1. 基礎設定
- `index.js` 啟動 Express、CORS、JSON、/health，連線 MongoDB（`.env`）

### 2. 模型
- `models/User.js`、`models/Expense.js`、`models/Budget.js`

### 3. 中介層
- `middleware/authMiddleware.js`：驗證 Bearer JWT，將 `userId` 注入 `req`

### 4. 控制器與路由
- `controllers/authController.js` + `routes/auth.js`：`POST /api/auth/register`、`POST /api/auth/login`
- `controllers/expenseController.js` + `routes/expenses.js`：
  - `GET /api/expenses`、`POST /api/expenses`、`DELETE /api/expenses/:id`
  - 新增支出後進行本月預算檢查，回傳 `alert` 給前端（80%/100%）
- `controllers/budgetController.js` + `routes/budgets.js`：
  - `GET /api/budgets`、`POST /api/budgets`（ALL/分類、period=monthly）、`GET /api/budgets/status`
- `controllers/forecastController.js` + `routes/forecast.js`：
  - `GET /api/forecast`（以當月平均速度推估本月總支出）

---

## 階段 5：整合與功能
- 客戶端請求帶 JWT，後端驗證後回應
- GPS 類別推測在客戶端完成（可改成伺服器端地點對映）
- 新增支出 -> 後端回 `alert` -> 前端觸發本地通知
- 離線佇列：回到 Dashboard 時嘗試送出所有暫存請求
- 即時同步（加分）：後端已保留 `socket.io` 依賴，可加事件 `expense:created` 廣播；前端用 `socket.io-client` 接收並更新列表

---

## 階段 6：測試與部署

### 1. 測試
- Postman/Insomnia 測試 REST API
- Jest（選用）做單元測試（前後端）
- 裝置測試：真機（Expo Go）檢查定位/生理辨識/通知權限

### 2. 部署
- 後端：Render/Railway/Heroku（設定環境變數與 `start` 腳本）
- 前端：Expo EAS Build 產生 APK/IPA 或透過 Expo Go 演示

### 3. 演示準備
- 錄製真機操作：登入（生理辨識）、新增支出（GPS 類別）、Dashboard 圖表、預算警告通知、洞察趨勢與預測、離線再上線同步

---

## 兩週開發排程建議
**Week 1**：前端畫面/導航、登入/註冊、支出新增、儀表板；後端 Auth + Expenses  
**Week 2**：預算/預測、離線同步、通知、（可選）即時同步、打包與演示

---

## 常見陷阱
- Android 模擬器連本機：請用 `10.0.2.2`；或用 `adb reverse` 之後可用 `localhost`
- iOS 模擬器（僅 macOS）：可用 `http://localhost:3000/api`
- Web 模式：請安裝 `react-dom` 與 `react-native-web`；需要可將 `EXPO_PUBLIC_API_URL=mock`
- 權限：首次啟動需允許定位與通知；生理辨識需先在裝置上註冊

---

## 參考
- Expo Docs：`https://docs.expo.dev/`
- Android Studio & Emulator：`https://developer.android.com/studio`
- MongoDB Atlas：`https://www.mongodb.com/atlas/database`


