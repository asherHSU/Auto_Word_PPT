import os
import win32com.client

# --- 使用者設定區 ---
# ❗ 請將此路徑修改成你的詩歌PPT根目錄
folder_to_scan = "D:\Desktop\church\Auto_ppt_word/2024 別是巴聖教會雲端詩歌PPT/400-499/"

# --- 程式主體 ---

# 1. 建立一個PowerPoint應用程式的實例
try:
    powerpoint = win32com.client.Dispatch("Powerpoint.Application")
    # 建議設為 True，這樣你可以親眼看到轉檔過程，比較有安全感
    # 設為 False 則會在背景靜默執行
    powerpoint.Visible = True 
except Exception as e:
    print(f"錯誤：無法啟動PowerPoint，請確認已安裝Office。 {e}")
    exit()

# 2. 遍歷指定資料夾下的所有檔案
print(f"開始掃描資料夾: {folder_to_scan}")
for dirpath, _, filenames in os.walk(folder_to_scan):
    for filename in filenames:
        # 3. 只鎖定 .ppt 結尾的舊版檔案
        if filename.lower().endswith(".ppt"):
            
            # 組合出完整的原始檔案路徑和新的檔案路徑
            input_path = os.path.join(dirpath, filename)
            # 新檔名就是把 .ppt 換成 .pptx
            output_path = os.path.join(dirpath, filename.replace(".ppt", ".pptx"))
            
            # 檢查是否已經存在轉好的 .pptx 檔案，如果存在就跳過
            if os.path.exists(output_path):
                print(f"  - 已存在，跳過: {filename}")
                continue

            print(f"  - 正在轉換: {filename} ...")
            
            try:
                # 4. 遙控PowerPoint打開舊檔案
                deck = powerpoint.Presentations.Open(input_path)
                
                # 5. 執行「另存新檔」，存成 .pptx 格式 (格式代碼 24 代表 .pptx)
                deck.SaveAs(output_path, 24)
                
                # 6. 關閉剛剛打開的簡報
                deck.Close()
                
            except Exception as e:
                print(f"    ! 轉換失敗: {filename}, 錯誤: {e}")

# 7. 所有工作完成後，關閉PowerPoint應用程式
print("所有 .ppt 檔案轉換完畢！")
powerpoint.Quit()