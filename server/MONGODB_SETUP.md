# MongoDB 本地安裝指南

## Windows 安裝 MongoDB

### 方法 1: 使用 MongoDB Community Server（推薦）

1. **下載 MongoDB Community Server**
   - 訪問：https://www.mongodb.com/try/download/community
   - 選擇 Windows 版本
   - 下載 MSI 安裝包

2. **安裝**
   - 執行下載的 MSI 文件
   - 選擇 "Complete" 安裝
   - 勾選 "Install MongoDB as a Service"
   - 勾選 "Install MongoDB Compass"（可選，圖形界面工具）

3. **驗證安裝**
   ```powershell
   mongod --version
   ```

4. **啟動 MongoDB 服務**
   - MongoDB 會自動作為 Windows 服務運行
   - 或手動啟動：在服務管理器中找到 "MongoDB" 服務並啟動

### 方法 2: 使用 Chocolatey（快速）

```powershell
# 安裝 Chocolatey（如果還沒有）
# 然後安裝 MongoDB
choco install mongodb

# 啟動 MongoDB 服務
net start MongoDB
```

### 方法 3: 使用 Docker（推薦開發環境）

```powershell
# 拉取 MongoDB 映像
docker pull mongo

# 運行 MongoDB 容器
docker run -d -p 27017:27017 --name mongodb mongo

# 檢查容器狀態
docker ps
```

## 驗證連接

安裝完成後，測試連接：

```powershell
# 方法 1: 使用 MongoDB Shell（如果已安裝）
mongosh

# 方法 2: 使用 Node.js 測試腳本
cd server
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/finance-app').then(() => { console.log('✓ Connected to MongoDB'); process.exit(0); }).catch(err => { console.error('✗ Connection failed:', err.message); process.exit(1); });"
```

## 啟動後端服務器

```powershell
cd server
npm run dev
```

如果看到 `✓ Connected to MongoDB`，表示連接成功！

## 常見問題

### MongoDB 服務未啟動
```powershell
# 檢查服務狀態
Get-Service MongoDB

# 啟動服務
Start-Service MongoDB
```

### 端口 27017 被占用
```powershell
# 檢查端口占用
netstat -ano | findstr :27017

# 或更改 MongoDB 配置使用其他端口
```

### 連接失敗
- 確認 MongoDB 服務正在運行
- 確認防火牆允許 27017 端口
- 檢查 `.env` 文件中的 `MONGODB_URI` 是否正確

