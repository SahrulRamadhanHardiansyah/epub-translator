# epub-translator

Aplikasi web untuk menerjemahkan konten file EPUB. Unggah file `.epub`, proses terjemahan akan berjalan di backend, dan Anda dapat mengunduh versi yang sudah diterjemahkan.

## Tumpukan Teknologi (Tech Stack)

-   **Frontend:**
    -   [Next.js](https://nextjs.org/) (React Framework)
    -   [TypeScript](https://www.typescriptlang.org/)
    -   [Tailwind CSS](https://tailwindcss.com/)
    -   [Supabase Client](https://supabase.com/) 

-   **Backend:**
    -   [Python](https://www.python.org/)
    -   [FastAPI](https://fastapi.tiangolo.com/)
    -   Library untuk pemrosesan EPUB dan API terjemahan.

## Struktur Proyek

```
.
├── backend/   # API & Logika Pemrosesan EPUB dengan Python
└── frontend/  # Antarmuka Pengguna dengan Next.js
```

## Instalasi dan Penyiapan

### 1. Backend

Jalankan perintah berikut dari direktori root.

```bash
# Pindah ke direktori backend
cd backend

#  Buat dan aktifkan virtual environment
python -m venv venv
source venv/bin/activate  # Untuk Linux/macOS
# venv\Scripts\activate   # Untuk Windows

# Instal dependensi Python
pip install -r requirements.txt

# Buat file .env dari contoh atau secara manual
# Anda perlu mengisi variabel seperti API key untuk layanan terjemahan
cp .env.example .env

# Jalankan server backend
python main.py
```

### 2. Frontend

Buka terminal baru dan jalankan perintah berikut dari direktori root.

```bash
# Pindah ke direktori frontend
cd frontend

# Instal dependensi Node.js
npm install

# Buat file .env.local untuk variabel lingkungan
# Anda perlu mengisi URL dan anon key dari proyek Supabase Anda
# Contoh isi file .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Jalankan server development frontend
npm run dev
```

Setelah kedua server berjalan, buka [`http://localhost:3000`](http://localhost:3000) di browser Anda.

## Cara Kerja

1.  **Unggah File**: Pengguna memilih dan mengunggah file `.epub` melalui antarmuka frontend.
2.  **Kirim ke Backend**: Frontend mengirimkan file ke API backend.
3.  **Proses di Backend**:
    -   Backend menerima file dan menyimpannya sementara di direktori `backend/temp`.
    -   `epub_processor.py` membongkar file EPUB, mengekstrak konten teks (biasanya file HTML atau XHTML).
    -   Teks dikirim ke layanan API terjemahan.
    -   Teks yang sudah diterjemahkan digunakan untuk menggantikan konten asli.
    -   Sebuah file `.epub` baru yang sudah diterjemahkan dibuat kembali.
4.  **Kirim Hasil**: Backend memberikan tautan unduhan atau mengirim file yang sudah diterjemahkan kembali ke frontend.
5.  **Unduh**: Pengguna dapat mengunduh file `.epub` yang sudah diterjemahkan.
