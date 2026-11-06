const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection } = require('tiktok-live-connector');

const USERNAME = process.env.TIKTOK_USER || 'bryanedu';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => c.readyState === 1 && c.send(data));
}

let conn;
function connect() {
  conn = new TikTokLiveConnection(USERNAME);

  conn.connect()
    .then(s => console.log('Conectado na live de @' + USERNAME, s.roomId || ''))
    .catch(e => {
      console.log('Live offline ou erro. Tentando de novo em 20s...', e.message || e);
      setTimeout(connect, 20000);
    });

  conn.on('chat', d => broadcast({
    type: 'chat', user: d.nickname || d.uniqueId, text: d.comment
  }));

  conn.on('gift', d => {
    if (d.giftType === 1 && !d.repeatEnd) return;
    broadcast({
      type: 'gift',
      user: d.nickname || d.uniqueId,
      gift: d.giftName || (d.giftDetails && d.giftDetails.giftName) || 'presente',
      count: d.repeatCount || 1
    });
  });

  conn.on('member', d => broadcast({ type: 'join', user: d.nickname || d.uniqueId }));
  conn.on('follow', d => broadcast({ type: 'follow', user: d.nickname || d.uniqueId }));

  conn.on('disconnected', () => {
    console.log('Desconectado. Reconectando em 20s...');
    setTimeout(connect, 20000);
  });
}

connect();
server.listen(PORT, () => console.log('Rodando na porta ' + PORT));
