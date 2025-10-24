import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'server/julie.db'));

// Verificar recordatorios
const reminders = db.prepare('SELECT * FROM reminders WHERE user_id = ?').all('usuario123');
console.log('Recordatorios en la base de datos:', reminders);

// Cerrar la base de datos
db.close();
