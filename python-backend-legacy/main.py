from fastapi import FastAPI, Query, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import tempfile
import zipfile
import shutil
from starlette.background import BackgroundTask
from src import logic

app = FastAPI()

# --- Project Root and Paths ---
try:
    # The script is in 'src', so we go up one level to get the project root.
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
except NameError:
    PROJECT_ROOT = os.getcwd() # Fallback for interactive environments

PPT_LIBRARY_PATH = os.path.join(PROJECT_ROOT, "resources", "ppt_library", "2025 別是巴聖教會雲端詩歌PPT修")
TEMPLATE_DOCX_PATH = os.path.join(PROJECT_ROOT, "resources", "template.docx")
SONGS_DB_PATH = os.path.join(PROJECT_ROOT, "resources", "songs_db.json")


# --- Database Loading ---
def load_song_database():
    with open(SONGS_DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

songs_db = load_song_database()

# --- Pydantic Models ---
class GenerateRequest(BaseModel):
    songs: List[str] = Body(..., description="A list of song titles to include in the presentation.")

# --- API Endpoints ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Auto PPT Word API"}

@app.get("/api/songs")
def search_songs(
    id: Optional[int] = Query(None, description="Search by song ID (exact match)"),
    name: Optional[str] = Query(None, description="Search by song name (case-insensitive, substring match)")
):
    """
    Search for songs in the database.
    You can search by song ID, or by name.
    """
    results = songs_db
    if id is not None:
        results = [song for song in results if song.get('id') == id]
    if name:
        results = [song for song in results if name.lower() in song.get('name', '').lower()]
    return results

@app.post("/api/generate")
def generate_files(request: GenerateRequest):
    """
    Generates the Word and PowerPoint files from a list of song titles.
    """
    song_order = request.songs
    
    temp_dir = tempfile.mkdtemp()
    output_docx_path = os.path.join(temp_dir, "敬拜大字報.docx")
    output_pptx_path = os.path.join(temp_dir, "敬拜PPT.pptx")
    zip_path = os.path.join(temp_dir, "presentation_files.zip")

    # --- Generate Files ---
    songs_data = logic.extract_song_data(song_order, PPT_LIBRARY_PATH)
    logic.generate_word_document(songs_data, TEMPLATE_DOCX_PATH, output_docx_path)
    logic.generate_projection_ppt(songs_data, output_pptx_path, lines_per_slide=2)

    # --- Zip Files ---
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        zipf.write(output_docx_path, os.path.basename(output_docx_path))
        zipf.write(output_pptx_path, os.path.basename(output_pptx_path))
        
    def cleanup():
        shutil.rmtree(temp_dir)

    return FileResponse(zip_path, media_type='application/zip', filename='敬拜資源.zip', background=BackgroundTask(cleanup))
