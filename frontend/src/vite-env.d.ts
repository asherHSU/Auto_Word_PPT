/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // 在此處添加更多環境變數...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}