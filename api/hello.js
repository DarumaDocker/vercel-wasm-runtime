const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

module.exports = (req, res) => {
  const wasmFile = 'grayscale.wasm';
  const soFile = wasmFile.replace(/\wasm$/, 'so');

  let byteFile = soFile;
  try {
    fs.accessSync(path.join(__dirname, 'wasm', soFile), fs.constants.F_OK | fs.constants.R_OK);
  } catch {
    byteFile = wasmFile;
  }

  const wasmedge = spawn(
    path.join(__dirname, 'WasmEdge-0.8.1-Linux', 'bin', '/wasmedge'),
    [path.join(__dirname, 'wasm', byteFile)]
  );

  let d = [];
  wasmedge.stdout.on('data', (data) => {
    d.push(data);
  });

  wasmedge.on('close', (code) => {
    let r = d.join('');
    let format = r.substring(0, 3);
    let buf = Buffer.from(r.substring(3), 'hex');

    res.setHeader('Content-Type', `image/${format}`);
    res.send(buf);
  });

  wasmedge.stdin.write(req.body);
  wasmedge.stdin.end('');
}

