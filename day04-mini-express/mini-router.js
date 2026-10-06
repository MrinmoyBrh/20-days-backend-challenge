class MiniRouter {
    constructor(){
        this.routes = [];
        this.middlewares = [];
  }

    //Register global middlewareclass MiniRouter 
 
  use(middlewarefn) {
    this.middlewares.push(middlewarefn);
  }

  // HTTP method registration helpers
  get(path, handler) {
    this._registerRoute('GET', path, handler);
  }

  post(path, handler) {
    this._registerRoute('POST', path, handler);
  }

  delete(path, handler) {
    this._registerRoute('DELETE', path, handler);
  }

  _registerRoute(method, path, handler) {
    const paramNames = [];
    
    // Normalize path by stripping trailing slash
    const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

    // Convert :param to regex capture group and escape slashes
    const regexString = normalized
      .replace(/\//g, '\\/')
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^\\/]+)';
      });

    this.routes.push({
      method: method.toUpperCase(),
      pathPattern: new RegExp(`^${regexString}\\/?$`),
      paramNames,
      handler
    });
  }

  _matchRoute(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;

      const match = pathname.match(route.pathPattern);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    const pathname = url.pathname;
    const method = req.method;

    // Decorate response object with res.json helper
    res.json = (statusCode, data) => {
      const payload = JSON.stringify(data);
      res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      });
      res.end(payload);
    };

    const match = this._matchRoute(method, pathname);
    req.params = match ? match.params : {};
    req.query = Object.fromEntries(url.searchParams.entries());

    // Middleware and handler pipeline
    const pipeline = [...this.middlewares];

    if (match) {
      pipeline.push(match.handler);
    } else {
      pipeline.push((req, res) => {
        res.json(404, { success: false, error: `Route ${method} ${pathname} not found` });
      });
    }

    let index = 0;
    const next = (err) => {
      if (err) {
        console.error('Middleware Error:', err.message);
        return res.json(500, { success: false, error: err.message || 'Internal Server Error' });
      }

      if (index < pipeline.length) {
        const currentFn = pipeline[index++];
        try {
          currentFn(req, res, next);
        } catch (error) {
          next(error);
        }
      }
    };

    next();
  }
}

module.exports = MiniRouter;

  