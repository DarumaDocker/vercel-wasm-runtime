const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

module.exports = (req, res) => {
  const wasmFile = 'grayscale.wasm';
  const soPath = path.join('/tmp', wasmFile.replace(/\wasm$/, 'so'));

  fs.access(soPath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
    if (err) {
      const wasmedgec = spawn(
        path.join(__dirname, 'WasmEdge-0.8.1-Linux', 'bin', 'wasmedgec'),
        [
          path.join(__dirname, 'wasm', wasmFile),
          soPath
        ]
      );

      wasmedgec.on('close', function() {
        res.send('compiled');
      })
    } else {
      res.send('exists');
    }
  });
}
