const http = require('http');
const MiniRouter = require('./mini-router');

const app = new MiniRouter();
const PORT = 3000;

// In-memory data store
let products = [
  { id: '1', name: 'Mechanical Keyboard', price: 99 },
  { id: '2', name: 'Ergonomic Mouse', price: 49 }
];

// --- MIDDLEWARES ---

// 1. Logger Middleware: tracks latency and method
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`\x1b[36m--> [${req.method}]\x1b[0m ${req.url}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`\x1b[32m<-- [${req.method}]\x1b[0m ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// 2. Body Parser Middleware: buffers incoming stream chunks into req.body
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        req.body = body.trim() ? JSON.parse(body) : {};
        next();
      } catch (err) {
        res.json(400, { success: false, error: 'Malformed JSON payload' });
      }
    });
    req.on('error', (err) => next(err));
  } else {
    req.body = {};
    next();
  }
});

// --- ROUTES ---

// GET /
app.get('/', (req, res) => {
  res.json(200, {
    message: 'Welcome to your custom Mini-Express API!',
    features: ['Middleware chaining with next()', 'Dynamic route parameters (:id)', 'Custom res.json helper']
  });
});

// GET /products
app.get('/products', (req, res) => {
  res.json(200, { success: true, count: products.length, data: products });
});

// GET /products/:id - Dynamic parameter matching
app.get('/products/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.json(404, { success: false, error: `Product with ID ${req.params.id} not found` });
  }
  res.json(200, { success: true, data: product });
});

// POST /products - Create product using parsed req.body
app.post('/products', (req, res) => {
  const { name, price } = req.body;
  if (!name || price === undefined) {
    return res.json(400, { success: false, error: 'Both "name" and "price" are required.' });
  }

  const newProduct = {
    id: (products.length + 1).toString(),
    name: name.trim(),
    price: Number(price)
  };

  products.push(newProduct);
  res.json(201, { success: true, data: newProduct });
});

// DELETE /products/:id - Parameterized deletion
app.delete('/products/:id', (req, res) => {
  const initialLength = products.length;
  products = products.filter((p) => p.id !== req.params.id);

  if (products.length === initialLength) {
    return res.json(404, { success: false, error: `Product with ID ${req.params.id} not found` });
  }

  res.json(200, { success: true, message: `Product ${req.params.id} deleted successfully.` });
});

// Mount router on native HTTP server
const server = http.createServer((req, res) => app.handle(req, res));

server.listen(PORT, () => {
  console.log(`Day 4 Mini-Express running at http://localhost:${PORT}`);
});