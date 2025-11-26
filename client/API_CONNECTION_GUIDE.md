# API 連接問題診斷指南

## 問題：無法註冊帳戶

如果註冊失敗，通常是因為前端無法連接到後端服務器。

## 快速診斷步驟

### 1. 確認後端服務器正在運行

```powershell
# 檢查端口 3000 是否被占用
netstat -ano | findstr :3000
```

應該看到類似：
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
```

### 2. 測試後端 API

在瀏覽器打開：`http://localhost:3000/health`

應該看到：`{"status":"ok"}`

### 3. 根據運行環境設置正確的 API URL

#### Android 模擬器（推薦）

```powershell
cd client
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:3000/api"
npm run start
```

**為什麼用 10.0.2.2？**
- Android 模擬器將 `10.0.2.2` 映射到主機的 `localhost`
- 不能直接使用 `localhost` 或 `127.0.0.1`

#### 真機（Expo Go）

1. **查找電腦 IP 地址**：
   ```powershell
   ipconfig
   ```
   找到 "IPv4 地址"，例如：`192.168.1.10`

2. **設置環境變量**：
   ```powershell
   cd client
   $env:EXPO_PUBLIC_API_URL="http://192.168.1.10:3000/api"
   npm run start
   ```

3. **確保手機和電腦在同一 Wi-Fi 網絡**

#### Web 瀏覽器

```powershell
cd client
$env:EXPO_PUBLIC_API_URL="http://localhost:3000/api"
npm run web
```

#### 使用 adb reverse（Android 模擬器替代方案）

如果你想在模擬器中使用 `localhost`：

```powershell
# 設置端口轉發
adb reverse tcp:3000 tcp:3000

# 然後使用 localhost
cd client
$env:EXPO_PUBLIC_API_URL="http://localhost:3000/api"
npm run start
```

## 常見錯誤訊息

### "無法連接到服務器" / "Network Error"
- **原因**：API URL 配置錯誤或後端未運行
- **解決**：
  1. 確認後端服務器正在運行
  2. 根據運行環境設置正確的 `EXPO_PUBLIC_API_URL`
  3. 重啟 Expo 開發服務器

### "ECONNREFUSED"
- **原因**：無法連接到指定的主機和端口
- **解決**：
  - Android 模擬器：使用 `10.0.2.2`
  - 真機：使用電腦的 IP 地址
  - Web：使用 `localhost`

### "Database not available"
- **原因**：MongoDB 未連接
- **解決**：確認 MongoDB 服務正在運行

## 驗證設置

註冊時，如果出現錯誤，新的錯誤處理會顯示：
- 當前使用的 API URL
- 具體的錯誤訊息
- 針對不同環境的建議

## 調試技巧

1. **查看控制台日誌**：
   - 在註冊失敗時，查看 Metro 終端和瀏覽器/設備控制台
   - 會顯示實際使用的 API URL 和錯誤詳情

2. **測試 API 端點**：
   ```powershell
   cd server
   node test-register-api.js
   ```

3. **檢查環境變量**：
   在 `client/constants/apiUrl.js` 中，會顯示當前使用的 API URL

## 快速檢查清單

- [ ] 後端服務器正在運行（端口 3000）
- [ ] MongoDB 服務正在運行
- [ ] 根據運行環境設置了正確的 `EXPO_PUBLIC_API_URL`
- [ ] 重啟了 Expo 開發服務器（設置環境變量後）
- [ ] 手機和電腦在同一網絡（真機測試時）

