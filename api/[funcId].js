const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

module.exports = async (req, res) => {
  const funcId = req.query.funcId;
  const wasmPath = os.tmpdir() + path.sep + funcId + '.wasm';

  try {
    await getWasmFile(wasmPath, funcId);
    let url = req.body.url;
    const resourceStream = await getResource(url);
    if (resourceStream) {
      const buf = await runVm(wasmPath, resourceStream);
      res.setHeader('Content-Type', 'image/png');
      res.send(buf);
    } else {
      res.status(404).end(`Can't get resource from "${url}"`);
    }
  } catch(err) {
    console.error(err);
    res.status(500).end('Error occured');
  }

};

async function getWasmFile(wasmPath, funcId) {
  return new Promise((resolve, reject) => {
    fs.access(wasmPath, fs.constants.F_OK, (err) => {
      if (err) {
        axios({
          method: 'get',
          headers: {Authorization: process.env.REACTOR_APP_AUTH_TOKEN},
          url: `${process.env.REACTOR_API_PREFIX}/api/_funcs/${funcId}`,
          responseType: 'stream'
        }).then((wasmResp) => {
          wasmResp.data.on('end', () => {
            resolve();
          });

          wasmResp.data.pipe(fs.createWriteStream(wasmPath));
        }).catch(() => {
          reject();
        });
      } else {
        resolve();
      }
    });
  });
}

async function getResource(url) {
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    }).then((resp) => {
      resolve(resp.data);
    }).catch((err) => {
      reject();
    });
  });
}

async function runVm(wasmPath, unsplashImageStream) {
  return new Promise((resolve, reject) => {
    const wasmedge = spawn(path.join(__dirname, 'wasmedge'), [wasmPath]);

    let d = [];
    wasmedge.stdout.on('data', (data) => {
      d.push(data);
    });

    wasmedge.on('close', (code) => {
      let buf = Buffer.concat(d);
      resolve(buf);
    });

    unsplashImageStream.pipe(wasmedge.stdin);
  });
}
