# 查看 MongoDB 數據庫數據

## 方法 1: 使用查詢腳本（推薦）

運行我們提供的腳本：

```powershell
cd server
node view-db-data.js
```

這會顯示：
- 所有用戶
- 最近的支出記錄
- 所有預算設定
- 按用戶的摘要統計

## 方法 2: 使用 MongoDB Compass（圖形界面）

1. **下載 MongoDB Compass**
   - 訪問：https://www.mongodb.com/try/download/compass
   - 下載並安裝

2. **連接數據庫**
   - 打開 MongoDB Compass
   - 連接字串：`mongodb://localhost:27017`
   - 點擊 "Connect"

3. **查看數據**
   - 選擇數據庫：`finance-app`
   - 查看集合：
     - `users` - 用戶數據
     - `expenses` - 支出記錄
     - `budgets` - 預算設定

## 方法 3: 使用 MongoDB Shell (mongosh)

```powershell
# 連接到本地 MongoDB
mongosh mongodb://localhost:27017/finance-app

# 查看所有數據庫
show dbs

# 使用 finance-app 數據庫
use finance-app

# 查看所有集合
show collections

# 查看用戶
db.users.find().pretty()

# 查看支出（最近10筆）
db.expenses.find().sort({date: -1}).limit(10).pretty()

# 查看預算
db.budgets.find().pretty()

# 統計當月支出
db.expenses.aggregate([
  {
    $match: {
      date: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      }
    }
  },
  {
    $group: {
      _id: "$category",
      total: { $sum: "$amount" },
      count: { $sum: 1 }
    }
  }
])
```

## 方法 4: 使用 Node.js 腳本查詢特定數據

創建自定義查詢腳本：

```javascript
const mongoose = require('mongoose');
const Expense = require('./models/Expense');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // 查詢當月所有支出
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const expenses = await Expense.find({
    date: { $gte: start, $lt: end }
  });
  
  console.log('Current month expenses:', expenses);
  process.exit(0);
});
```

## 快速查詢命令

### 查看所有用戶
```javascript
db.users.find().pretty()
```

### 查看特定用戶的支出
```javascript
// 先找到用戶 ID
const user = db.users.findOne({email: "your@email.com"})
// 然後查詢該用戶的支出
db.expenses.find({userId: user._id}).pretty()
```

### 查看當月總支出
```javascript
db.expenses.aggregate([
  {
    $match: {
      date: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: "$amount" }
    }
  }
])
```

### 按類別統計支出
```javascript
db.expenses.aggregate([
  {
    $group: {
      _id: "$category",
      total: { $sum: "$amount" },
      count: { $sum: 1 }
    }
  },
  { $sort: { total: -1 } }
])
```

## 清除測試數據（謹慎使用）

```javascript
// 清除所有支出
db.expenses.deleteMany({})

// 清除所有預算
db.budgets.deleteMany({})

// 清除所有用戶（會清除所有相關數據）
db.users.deleteMany({})
```

