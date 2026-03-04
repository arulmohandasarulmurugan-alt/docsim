# DocSim

DocSim is a production-ready document similarity detection web application that compares uploaded TXT, PDF, and DOCX files using the Jaccard Similarity algorithm:

`J(A,B) = |A ∩ B| / |A ∪ B|`

## Tech Stack

- Node.js + Express
- MySQL (`mysql2`)
- Multer (file uploads)
- `pdf-parse` (PDF extraction)
- `mammoth` (DOCX extraction)
- Vanilla frontend + Three.js cinematic hyperspeed background

## Repository Structure

```text
SIMILARITY/
├─ config/
│  └─ db.js
├─ controllers/
│  └─ scanController.js
├─ database/
│  └─ schema.sql
├─ middleware/
│  ├─ errorMiddleware.js
│  └─ uploadMiddleware.js
├─ public/
│  ├─ app.js
│  ├─ hyperspeed.js
│  ├─ index.html
│  └─ style.css
├─ routes/
│  └─ scanRoutes.js
├─ uploads/
│  └─ .gitkeep
├─ .env.example
├─ .gitignore
├─ package.json
└─ server.js
```

## API Endpoints

1. `POST /api/scan/compare`
- Form field: `files` (2-100 files)
- Allowed types: `.txt`, `.pdf`, `.docx`
- Computes pairwise Jaccard similarity and stores rows in `scan_results`.

2. `GET /api/scan/history`
- Returns all saved scan records ordered by newest first.

## Database Setup

1. Create and import schema:

```sql
SOURCE database/schema.sql;
```

Or run:

```bash
mysql -u root -p < database/schema.sql
```

2. Ensure DB name is `SIMILARITY`.

## Environment Configuration

1. Copy `.env.example` to `.env`.
2. Set database values:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=SIMILARITY
```

## Local Run

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
npm start
```

3. Open:

```text
http://localhost:3000
```

On startup, terminal prints:
- `Database connected successfully`
- `Server running on port 3000`

## Deployment (Railway or Render)

1. Push repository to GitHub.
2. Create a MySQL instance (Railway MySQL or external managed MySQL).
3. Set environment variables from `.env.example`.
4. Deploy web service with start command:

```bash
npm start
```

5. Ensure service exposes port `3000`.

## QA Checklist

- Upload validation: blocks fewer than 2 and more than 100 files.
- File format validation: TXT/PDF/DOCX only.
- `/api/scan/compare` matches frontend `FormData(files)`.
- `/api/scan/history` payload matches repository table rendering.
- `scan_results` table columns match backend SQL insert/select queries.
