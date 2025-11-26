const http = require('http');

const data = JSON.stringify({
	email: 'test@example.com',
	password: 'test123456'
});

const options = {
	hostname: 'localhost',
	port: 3000,
	path: '/api/auth/register',
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Content-Length': data.length
	}
};

console.log('測試註冊 API...');
const req = http.request(options, (res) => {
	let responseData = '';

	res.on('data', (chunk) => {
		responseData += chunk;
	});

	res.on('end', () => {
		console.log(`狀態碼: ${res.statusCode}`);
		console.log('回應:', responseData);
		if (res.statusCode === 201) {
			console.log('✓ 註冊成功！');
		} else {
			console.log('✗ 註冊失敗');
		}
		process.exit(0);
	});
});

req.on('error', (err) => {
	console.error('✗ 請求錯誤:', err.message);
	process.exit(1);
});

req.write(data);
req.end();
