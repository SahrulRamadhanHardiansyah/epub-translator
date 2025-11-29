import os
import shutil
import asyncio
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from core.epub_processor import EpubTranslator

load_dotenv()

SERVER_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)

async def process_translation_job(job_id: str, input_path: str, output_path: str, api_key: str, lang: str, style: str, user_id: str):
    try:
        supabase.table("jobs").update({"status": "processing"}).eq("id", job_id).execute()
        
        translator = EpubTranslator(api_key=api_key)
        
        await translator.process_book_async(
            input_path=input_path,
            output_path=output_path,
            target_lang=lang,
            style=style
        )
        
        download_url = f"/download/{job_id}"
        supabase.table("jobs").update({
            "status": "completed", 
            "download_url": download_url
        }).eq("id", job_id).execute()
        
        if api_key == SERVER_API_KEY:
             current = supabase.table("profiles").select("quota_used").eq("id", user_id).single().execute()
             new_quota = (current.data['quota_used'] if current.data else 0) + 1
             supabase.table("profiles").update({"quota_used": new_quota}).eq("id", user_id).execute()

    except Exception as e:
        print(f"Job Failed: {e}")
        supabase.table("jobs").update({"status": "failed", "message": str(e)}).eq("id", job_id).execute()
        try: os.remove(input_path)
        except: pass

@app.post("/translate")
async def request_translation(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_lang: str = Form("Indonesian"),
    style: str = Form("Formal"),
    api_key: str = Form(None),
    user_id: str = Form(...)
):
    final_api_key = api_key if (api_key and len(api_key) > 10) else SERVER_API_KEY
    if not final_api_key: raise HTTPException(500, "API Key config missing")
    
    if final_api_key == SERVER_API_KEY:
        user_data = supabase.table("profiles").select("quota_used").eq("id", user_id).single().execute()
        if user_data.data and user_data.data.get('quota_used', 0) >= 3:
            raise HTTPException(400, "Kuota habis.")

    job_data = {
        "user_id": user_id,
        "filename": file.filename,
        "status": "pending"
    }
    job_res = supabase.table("jobs").insert(job_data).execute()
    job_id = job_res.data[0]['id']

    input_path = str(TEMP_DIR / f"{job_id}_input.epub")
    output_path = str(TEMP_DIR / f"{job_id}_translated.epub")
    
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    background_tasks.add_task(
        process_translation_job, 
        job_id, input_path, output_path, final_api_key, target_lang, style, user_id
    )

    return {"status": "queued", "job_id": job_id}

@app.get("/jobs/{user_id}")
def get_user_jobs(user_id: str):
    res = supabase.table("jobs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
    return res.data

@app.get("/download/{job_id}")
def download_result(job_id: str):
    path = TEMP_DIR / f"{job_id}_translated.epub"
    if not path.exists():
        raise HTTPException(404, "File tidak ditemukan atau sudah dihapus.")
    
    try:
        job_data = supabase.table("jobs").select("filename").eq("id", job_id).single().execute()
        original_name = job_data.data['filename'] if job_data.data else "book.epub"
    except Exception:
        original_name = "book.epub"

    clean_filename = f"Translated_{original_name}"
    
    return FileResponse(path, media_type='application/epub+zip', filename=clean_filename)

@app.get("/")
def health_check():
    return {"status": "ok"}