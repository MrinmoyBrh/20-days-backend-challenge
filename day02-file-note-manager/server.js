const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = 3000;
const DB_PATH = path.join9=(__dirname, 'notes.json');

//Helper 1: Read notes from disk
async function getNotes() {
    try{
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data || '[]');
    } catch (errr) {
        if (err.code === 'ENOENT'){
            await fs.writeFile(DB_PATH, '[]');
            return [];
        }
        throw err;
    }
}

// Helper 2: Save notes to dosk
async function saveNotes(notes) {
    await fs.writeFile(DB_PATH, JSON.stringify(notes, null,2), 'utf-8');
}

//Helper 3: Parse incoing request body chunks
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data',(chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }catch (err){
                reject(new Error('Invalid JSON format'));
            }
        });
        req.on('Error', (err) => reject(err));
    });
}

// Helper 4: Standard JSON response sender
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

// Server Definition
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // 1. GET /api/notes - Read all notes
    if (pathname === '/api/notes' && method === 'GET') {
      const notes = await getNotes();
      return sendJSON(res, 200, { success: true, count: notes.length, data: notes });
    }

    // 2. POST /api/notes - Create a note
    if (pathname === '/api/notes' && method === 'POST') {
      const body = await parseRequestBody(req);

      if (!body.title || !body.content) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Both "title" and "content" are required fields.'
        });
      }

      const notes = await getNotes();
      const newNote = {
        id: Date.now().toString(),
        title: body.title.trim(),
        content: body.content.trim(),
        createdAt: new Date().toISOString()
      };

      notes.push(newNote);
      await saveNotes(notes);

      return sendJSON(res, 201, { success: true, data: newNote });
    }

    // 3. DELETE /api/notes?id=:id - Delete by Query Param
    if (pathname === '/api/notes' && method === 'DELETE') {
      const id = url.searchParams.get('id');

      if (!id) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Query parameter "id" is required (e.g., /api/notes?id=123).'
        });
      }

      const notes = await getNotes();
      const initialLength = notes.length;
      const filteredNotes = notes.filter((n) => n.id !== id);

      if (filteredNotes.length === initialLength) {
        return sendJSON(res, 404, { success: false, error: `Note with id ${id} not found.` });
      }

      await saveNotes(filteredNotes);
      return sendJSON(res, 200, { success: true, message: `Note ${id} deleted successfully.` });
    }

    // 404 Catch-All
    return sendJSON(res, 404, { success: false, error: 'Route not found' });
  } catch (error) {
    console.error('Server error:', error.message);
    return sendJSON(res, 500, { success: false, error: error.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`Day 2 server running at http://localhost:${PORT}`);
});
