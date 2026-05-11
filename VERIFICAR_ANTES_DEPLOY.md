# Checklist de Verificação Antes do Deploy

## Problema Atual
O Vercel está falhando no build com erro de sintaxe no arquivo `ScanAssessmentsSection.tsx`

## Passos para Resolver

### 1. Verificar se o arquivo correto está no GitHub

Acesse: `https://github.com/[seu-usuario]/[seu-repo]/blob/main/src/components/sections/ScanAssessmentsSection.tsx`

**O arquivo NÃO PODE conter:**
- `<<<<<<< HEAD`
- `=======`
- `>>>>>>> `

Se encontrar essas linhas, o arquivo ainda tem marcadores de conflito de merge.

### 2. Substituir o arquivo completamente

**Opção A - Via GitHub Web (Recomendado):**

1. Acesse o arquivo no GitHub
2. Clique em "Delete this file" (ícone de lixeira)
3. Commit a deleção
4. Clique em "Add file" > "Create new file"
5. Nome do arquivo: `src/components/sections/ScanAssessmentsSection.tsx`
6. Cole o conteúdo do arquivo correto (está no final deste documento)
7. Commit o novo arquivo

**Opção B - Via Git Local:**

```bash
# Clonar o repositório
git clone https://github.com/[seu-usuario]/[seu-repo].git
cd [seu-repo]

# Copiar o arquivo correto para o repositório
cp /caminho/para/ScanAssessmentsSection.tsx src/components/sections/

# Adicionar e commitar
git add src/components/sections/ScanAssessmentsSection.tsx
git commit -m "Fix: Replace ScanAssessmentsSection with clean version"
git push origin main
```

### 3. Limpar cache do Vercel

1. Acesse o painel do Vercel
2. Vá em "Settings" > "General"
3. Role até "Build & Development Settings"
4. Clique em "Redeploy"
5. Marque a opção "Clear build cache and retry deployment"

### 4. Verificar variáveis de ambiente

Certifique-se que o Vercel tem as variáveis:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Arquivo Correto (ScanAssessmentsSection.tsx)

```typescript
import React, { useState, useRef } from 'react'
import { Camera, Upload, CheckCircle, XCircle, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import CameraCapture from '../CameraCapture'

interface ScanResult {
  fileName: string
  status: 'success' | 'error' | 'processing'
  studentName?: string
  score?: number
  error?: string
}

interface ScanAssessmentsSectionProps {
  userId: string
  classes: any[]
  gradings: any[]
}

export default function ScanAssessmentsSection({ userId, classes, gradings }: ScanAssessmentsSectionProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleScanAll = async () => {
    if (selectedFiles.length === 0) {
      alert('Por favor, selecione pelo menos uma imagem')
      return
    }

    if (!studentName.trim()) {
      alert('Por favor, informe o nome do aluno')
      return
    }

    setIsScanning(true)
    const results: ScanResult[] = []

    for (const file of selectedFiles) {
      try {
        results.push({
          fileName: file.name,
          status: 'processing'
        })
        setScanResults([...results])

        const base64Image = await fileToBase64(file)

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const response = await fetch(`${supabaseUrl}/functions/v1/scan-assessment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            image: base64Image,
            studentName: studentName.trim()
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          results[results.length - 1] = {
            fileName: file.name,
            status: 'success',
            studentName: studentName,
            score: data.score
          }
        } else {
          results[results.length - 1] = {
            fileName: file.name,
            status: 'error',
            error: data.error || 'Erro ao processar imagem'
          }
        }
      } catch (error) {
        results[results.length - 1] = {
          fileName: file.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      }

      setScanResults([...results])
    }

    setIsScanning(false)
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleClearAll = () => {
    setSelectedFiles([])
    setScanResults([])
    setStudentName('')
  }

  const handleCameraCapture = (file: File) => {
    setSelectedFiles(prev => [...prev, file])
    setShowCamera(false)
  }

  const successCount = scanResults.filter(r => r.status === 'success').length
  const errorCount = scanResults.filter(r => r.status === 'error').length

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Escanear e Corrigir Provas</h2>
        <p className="text-gray-600 text-sm">
          Envie fotos ou scans das provas com QR Code para correção automática
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome do Aluno
        </label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Digite o nome completo do aluno"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isScanning}
        />
        <p className="text-xs text-gray-500 mt-1">
          O nome será usado para identificar o aluno no sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          <Upload size={20} />
          Selecionar Arquivos
        </button>

        <button
          onClick={() => setShowCamera(true)}
          disabled={isScanning}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
        >
          <Camera size={20} />
          Capturar com Câmera
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">
              Arquivos Selecionados ({selectedFiles.length})
            </h3>
            <button
              onClick={handleClearAll}
              disabled={isScanning}
              className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
            >
              Limpar Tudo
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  disabled={isScanning}
                  className="ml-2 text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  <XCircle size={20} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleScanAll}
            disabled={isScanning || !studentName.trim()}
            className="w-full mt-4 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <>
                <Loader size={20} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                Processar Todas ({selectedFiles.length})
              </>
            )}
          </button>
        </div>
      )}

      {scanResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Resultados</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">
                Sucesso: {successCount}
              </span>
              <span className="text-red-600">
                Erro: {errorCount}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scanResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : result.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {result.status === 'success' && (
                      <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                    )}
                    {result.status === 'error' && (
                      <XCircle size={20} className="text-red-600 flex-shrink-0" />
                    )}
                    {result.status === 'processing' && (
                      <Loader size={20} className="text-blue-600 animate-spin flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{result.fileName}</span>
                  </div>

                  {result.status === 'success' && result.score !== undefined && (
                    <span className="text-sm font-bold text-green-700 ml-2">
                      {result.score.toFixed(1)}%
                    </span>
                  )}
                </div>

                {result.status === 'error' && result.error && (
                  <p className="text-xs text-red-600 mt-1 ml-7">{result.error}</p>
                )}

                {result.status === 'success' && result.studentName && (
                  <p className="text-xs text-gray-600 mt-1 ml-7">
                    Aluno: {result.studentName}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {scanResults.length === 0 && selectedFiles.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Camera size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">Nenhuma prova selecionada</p>
          <p className="text-sm text-gray-500">
            Tire fotos ou selecione arquivos das provas escaneadas
          </p>
        </div>
      )}
      </div>
    </>
  )
}
```

## Causas Comuns do Problema

1. **Conflito de merge não resolvido** - O GitHub ainda tem a versão antiga
2. **Cache do Vercel** - O Vercel está usando uma versão em cache
3. **Branch incorreta** - O deploy pode estar usando outra branch
4. **Arquivo duplicado** - Pode haver outro arquivo com nome similar

## Solução Definitiva

Se nada funcionar, tente isto:

1. No Vercel, vá em Settings > Git
2. Verifique qual branch está configurada (main, master, etc)
3. No GitHub, acesse essa branch específica
4. Delete o arquivo `ScanAssessmentsSection.tsx`
5. Crie novamente com o conteúdo correto acima
6. No Vercel, force um novo deploy limpando o cache
