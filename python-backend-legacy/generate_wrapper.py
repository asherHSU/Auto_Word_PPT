import sys
import os
import json
import tempfile
import zipfile
import shutil

# Add the parent directory to the sys.path to import logic.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import logic

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_wrapper.py <path_to_song_order_json>", file=sys.stderr)
        sys.exit(1)

    song_order_json_path = sys.argv[1]

    try:
        with open(song_order_json_path, 'r', encoding='utf-8') as f:
            song_order = json.load(f)
    except Exception as e:
        print(f"Error reading song order JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # --- Project Root and Paths (relative to this script) ---
    # This script is in python-backend-legacy, so its parent is the project root.
    PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
    
    PPT_LIBRARY_PATH = os.path.join(PROJECT_ROOT, "..", "resources", "ppt_library", "2025 別是巴聖教會雲端詩歌PPT修")
    TEMPLATE_DOCX_PATH = os.path.join(PROJECT_ROOT, "..", "resources", "template.docx")

    # Use a temporary directory for output
    with tempfile.TemporaryDirectory() as temp_output_dir:
        output_docx_path = os.path.join(temp_output_dir, "敬拜大字報.docx")
        output_pptx_path = os.path.join(temp_output_dir, "敬拜PPT.pptx")
        zip_path = os.path.join(temp_output_dir, "presentation_files.zip")

        try:
            # --- Generate Files ---
            songs_data = logic.extract_song_data(song_order, PPT_LIBRARY_PATH)
            logic.generate_word_document(songs_data, TEMPLATE_DOCX_PATH, output_docx_path)
            logic.generate_projection_ppt(songs_data, output_pptx_path, lines_per_slide=2)

            # --- Zip Files ---
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                zipf.write(output_docx_path, os.path.basename(output_docx_path))
                zipf.write(output_pptx_path, os.path.basename(output_pptx_path))
            
            print(zip_path) # Output the path to the generated zip file

        except Exception as e:
            print(f"Error during file generation: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
