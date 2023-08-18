const express = require('express');
const app = express();
const { Server } = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const io = new Server(server);
var mysql = require('mysql');
const port = 5000;

server.keepAliveTimeout = (60 * 1000) + 10000000;
server.headersTimeout = (60 * 1000) + 20000000;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// MySQL bağlantısı
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'emkologin_lock',
  password: 'H9dxb?NYnAgN',
  database: 'emkologin_lock'
});

connection.connect((err) => {
  if (err) {
    console.error('MySQL bağlantısı başarısız oldu: ' + err.stack);
    return;
  }

  console.log('MySQL bağlantısı başarıyla gerçekleştirildi.');
});

// Bağlı kullanıcılar
const connectedUsers = [];

// Yeni kullanıcı bağlandığında
io.on('connection', (socket) => {
	console.log('Kullanıcı bağlandı: ' + socket.id);
		
	// Kullanıcı bilgilerini alın ve connectedUsers dizisine ekle
	socket.on('userConnected', (user) => {
		console.log('Kullanıcı bilgileri alındı: ' + user);
		connectedUsers.push({
			mac_address: user,
			socketId: socket.id
		});
	});

	// Kullanıcı ayrıldığında
	socket.on('disconnect', () => {
		console.log('Kullanıcı ayrıldı: ' + socket.id);

		// connectedUsers dizisinden kullanıcıyı sil
		const userIndex = connectedUsers.findIndex((user) => user.socketId === socket.id);
		if (userIndex !== -1) {
			connectedUsers.splice(userIndex, 1);
		}
	});
});

// Veritabanındaki değişiklikleri kontrol edin
var status = 0;
setInterval(() => {
	connectedUsers.forEach((kullanici) => {
		const d = new Date();
		connection.query('SELECT * FROM socket_events WHERE mac_address = "'+kullanici.mac_address+'"', (error, results, fields) => {
			const userSocket = io.sockets.sockets.get(kullanici.socketId);
			if (userSocket) {
				if(results.length > 0) {
					console.log('Durumu Değişti : ' + kullanici.mac_address+" -> "+results[0].durum);
					userSocket.emit('response', {durum: results[0].durum});
					connection.query('DELETE FROM socket_events WHERE mac_address="'+kullanici.mac_address+'"', (error, results, fields) => {
						console.log('Guncellendi');
					});
				}
			}
		});
	});
	
	connection.query('DELETE FROM socket_events WHERE created_at < (NOW() - INTERVAL 5 SECOND)', (error, results, fields) => {
	    
	});
}, 1000);

server.listen(port, () => {
    console.log('Server is listening at the port: '+port);
});