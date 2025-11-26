const mongoose = require('mongoose');

const mongoUri = 'mongodb://localhost:27017/finance-app';

console.log('正在測試 MongoDB 連接...');
console.log('連接字串:', mongoUri);

mongoose
	.connect(mongoUri)
	.then(() => {
		console.log('✓ MongoDB 連接成功！');
		console.log('  數據庫名稱:', mongoose.connection.name);
		console.log('  主機:', mongoose.connection.host);
		console.log('  端口:', mongoose.connection.port);
		process.exit(0);
	})
	.catch((err) => {
		console.error('✗ 連接失敗:', err.message);
		console.error('  請確認 MongoDB 服務正在運行');
		process.exit(1);
	});

