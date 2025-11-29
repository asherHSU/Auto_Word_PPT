import pandas as pd
import os
import json

def main():
    try:
        # The script is in 'src', so we go up one level to get the project root.
        PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    except NameError:
        PROJECT_ROOT = os.getcwd() # Fallback for interactive environments

    EXCEL_PATH = os.path.join(PROJECT_ROOT, "resources", "ppt_library", "2025 別是巴聖教會雲端詩歌PPT修", "2025別是巴修正詩歌清單.xlsx")
    JSON_PATH = os.path.join(PROJECT_ROOT, "resources", "songs_db.json")
    
    # Read the excel file, skipping the header row.
    df = pd.read_excel(EXCEL_PATH, header=1)
    
    songs = []
    # The columns are in pairs, starting from column 0.
    for i in range(0, len(df.columns), 2):
        # Check if the next column exists
        if i + 1 >= len(df.columns):
            continue
            
        num_col = df.columns[i]
        name_col = df.columns[i+1]
        
        # Drop rows where both number and name are NaN
        temp_df = df[[num_col, name_col]].dropna(how='all')

        for index, row in temp_df.iterrows():
            song_num = row[num_col]
            song_name = row[name_col]
            
            # Further clean up data
            if pd.notna(song_num) and pd.notna(song_name):
                # Song number might be float, convert to int
                try:
                    song_num = int(song_num)
                except (ValueError, TypeError):
                    continue # Skip if conversion fails
                
                # Song name might have extra spaces
                song_name = str(song_name).strip()

                if song_name: # Ensure song name is not empty after stripping
                    songs.append({
                        "id": song_num,
                        "name": song_name
                    })

    # Sort songs by id
    songs.sort(key=lambda x: x['id'])

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(songs, f, ensure_ascii=False, indent=4)
        
    print(f"Successfully created database with {len(songs)} songs at: {JSON_PATH}")
    # print first 5 songs
    print(json.dumps(songs[:5], ensure_ascii=False, indent=4))

if __name__ == "__main__":
    main()