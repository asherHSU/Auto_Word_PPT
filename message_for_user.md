請啟動伺服器並測試檔案生成功能。我需要您的測試結果才能繼續。
請先執行 `npm start --prefix backend` 啟動伺服器。
然後執行 `curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"songs": ["讚美之泉", "耶穌我愛祢", "祢真偉大"]}' --output generated_files.zip` 進行測試。