const http =require('http');
const os = require('os');

const PORT = 3000;

const server= createServer = http.createServer((req, res) => {
    //Set headers for JSON response
    res.setHeader('content-type', 'application/json');

    //Route 1: Home
    if (req.url === '/' && req.method === 'GET'){
        res.writeHead(200);
        res.end(JSON.stringify({
            message: "Welcome to day 1 backend challenge API!",
            endpoints: ["/api/info", "api/ping"]
        }));
    }
    //route 2 system matrix info
    else if (req.url === '/api/info' && req.method === 'GET'){
        const systemInfo = {
            platform: os.platform(),
            archetecture : os.arch(),
            cpus : os.cpus().length,
            totalmemoryGB: (os.totalmem() / (1024**3)).toFixed(2),
            freeMemoryGB: (os.freemem() / (1024**3)).toFixed(2),
            uptimeMinutes: (os.uptime() / 60).toFixed(2),
            timestamp: newnDate().toISOString()
        };

        res.writeHead(200);
        res.end(json.stringify({ success: true, data: systemInfo}));
    }
    //Route 3: health check
    else if (req.url === '/api/ping' && req.method === 'GET'){
        res.writeHead(200);
        res.end(JSON.stringify({ status: "OK", pong: true}));
    }
    // 404 route
    else {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: "Route not found"}));
    }
});

server.listen(PORT, () => {
    console.log(`Day 1 server running on http://localhost:${PORT}`);
});
