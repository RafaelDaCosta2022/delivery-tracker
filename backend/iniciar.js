const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ✅ Inicia o backend (index.js)
const backend = exec('node index.js');
backend.stdout.pipe(process.stdout);
backend.stderr.pipe(process.stderr);

// ✅ Aguarda e inicia o túnel
setTimeout(() => {
  console.log('🟡 Iniciando Cloudflare Tunnel...');
  const tunnel = exec('"C:\\cloudflared\\cloudflared.exe" tunnel --url http://localhost:3000');

  const handleOutput = (data) => {
    const match = data.toString().match(/https:\/\/.*?\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      console.log('🌐 Link detectado:', url);
      fs.writeFileSync(path.join(__dirname, 'link.json'), JSON.stringify({ url }));
    }
    process.stdout.write(data.toString());
  };

  tunnel.stdout.on('data', handleOutput);
  tunnel.stderr.on('data', handleOutput); // 👈 ESSA LINHA É O SEGREDO

}, 2000);

