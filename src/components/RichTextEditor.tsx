import React, { useRef, useMemo, useEffect, useState } from 'react'
import ReactQuill from 'react-quill'
import ImageResize from 'quill-image-resize-module-react'
import 'react-quill/dist/quill.snow.css'

// Registrar o módulo de redimensionamento
ReactQuill.Quill.register('modules/imageResize', ImageResize)

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: string
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Digite o texto da questão aqui...",
  height = "200px"
}) => {
  const quillRef = useRef<ReactQuill>(null)
  const [editorHeight, setEditorHeight] = useState(height)
  const [isResizing, setIsResizing] = useState(false)

  // Função para calcular a altura necessária baseada no conteúdo
  const calculateRequiredHeight = () => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return parseInt(height)

    const editorElement = quill.container.querySelector('.ql-editor') as HTMLElement
    if (!editorElement) return parseInt(height)

    // Altura do conteúdo + padding + margem de segurança
    const contentHeight = editorElement.scrollHeight
    const minHeight = parseInt(height)
    const maxHeight = 500 // Altura máxima
    
    return Math.min(Math.max(contentHeight + 40, minHeight), maxHeight)
  }

  // Função para ajustar altura do editor
  const adjustEditorHeight = () => {
    const requiredHeight = calculateRequiredHeight()
    const newHeight = `${requiredHeight}px`
    
    if (newHeight !== editorHeight) {
      setEditorHeight(newHeight)
    }
  }

  // Observer para detectar mudanças no DOM (incluindo redimensionamento de imagens)
  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const editorElement = quill.container.querySelector('.ql-editor') as HTMLElement
    if (!editorElement) return

    // Observer para mudanças no DOM
    const observer = new MutationObserver((mutations) => {
      let shouldResize = false
      
      mutations.forEach((mutation) => {
        // Detectar mudanças em imagens
        if (mutation.type === 'attributes' && 
            mutation.target instanceof HTMLImageElement &&
            (mutation.attributeName === 'style' || 
             mutation.attributeName === 'width' || 
             mutation.attributeName === 'height')) {
          shouldResize = true
        }
        
        // Detectar adição/remoção de elementos
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLImageElement || 
                (node instanceof HTMLElement && node.querySelector('img'))) {
              shouldResize = true
            }
          })
        }
      })
      
      if (shouldResize && !isResizing) {
        setIsResizing(true)
        // Pequeno delay para permitir que o redimensionamento termine
        setTimeout(() => {
          adjustEditorHeight()
          setIsResizing(false)
        }, 100)
      }
    })

    // Configurar observer
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'width', 'height', 'class']
    })

    // Ajustar altura inicial
    setTimeout(adjustEditorHeight, 100)

    // Cleanup
    return () => {
      observer.disconnect()
    }
  }, [value, editorHeight, isResizing])

  // Detectar mudanças no conteúdo
  useEffect(() => {
    const timer = setTimeout(adjustEditorHeight, 200)
    return () => clearTimeout(timer)
  }, [value])

  // Configuração personalizada do toolbar
  const modules = useMemo(() => ({
    imageResize: {
      parchment: ReactQuill.Quill.import('parchment'),
      modules: ['Resize', 'DisplaySize', 'Toolbar'],
      handleStyles: {
        backgroundColor: '#3b82f6',
        border: '2px solid white',
        borderRadius: '50%',
        width: '12px',
        height: '12px'
      },
      displayStyles: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontSize: '12px',
        padding: '4px 8px'
      }
    },
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    clipboard: {
      matchVisual: false,
    }
  }), [])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align',
    'link', 'image'
  ]

  // Handler personalizado para imagens
  function imageHandler() {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        // Verificar se é uma imagem válida
        if (!file.type.startsWith('image/')) {
          alert('Por favor, selecione apenas arquivos de imagem.')
          return
        }

        // Verificar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('O arquivo deve ter no máximo 5MB.')
          return
        }

        // Converter para base64 e inserir no editor
        const reader = new FileReader()
        reader.onload = () => {
          const quill = quillRef.current?.getEditor()
          if (quill) {
            const range = quill.getSelection()
            const index = range ? range.index : quill.getLength()
            
            // Inserir imagem
            quill.insertEmbed(index, 'image', reader.result)
            
            // Mover cursor após a imagem
            quill.setSelection(index + 1)
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  return (
    <div className="rich-text-editor">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{
          height: editorHeight,
          marginBottom: '42px' // Espaço para a toolbar
        }}
      />
      
      {/* Estilos customizados */}
      <style jsx global>{`
        .rich-text-editor .ql-editor {
          min-height: ${editorHeight};
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          transition: min-height 0.3s ease;
        }
        
        .rich-text-editor .ql-toolbar {
          border-top: 1px solid #d1d5db;
          border-left: 1px solid #d1d5db;
          border-right: 1px solid #d1d5db;
          border-radius: 6px 6px 0 0;
          background: #f9fafb;
        }
        
        .rich-text-editor .ql-container {
          border-bottom: 1px solid #d1d5db;
          border-left: 1px solid #d1d5db;
          border-right: 1px solid #d1d5db;
          border-radius: 0 0 6px 6px;
          font-family: inherit;
          transition: height 0.3s ease;
        }
        
        .rich-text-editor .ql-editor:focus {
          outline: none;
        }
        
        .rich-text-editor .ql-container.ql-snow {
          border: 1px solid #d1d5db;
        }
        
        .rich-text-editor .ql-toolbar.ql-snow {
          border: 1px solid #d1d5db;
        }
        
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
          display: inline-block;
          vertical-align: middle;
        }
        
        /* Melhorar aparência durante redimensionamento */
        .rich-text-editor .ql-editor img:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        /* Estilos para o módulo de redimensionamento */
        .rich-text-editor .ql-image-resize {
          border: 2px dashed #3b82f6 !important;
          background: rgba(59, 130, 246, 0.1);
        }
        
        .rich-text-editor .ql-image-resize-handle {
          background: #3b82f6 !important;
          border: 2px solid white !important;
          border-radius: 50% !important;
          width: 12px !important;
          height: 12px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        
        .rich-text-editor .ql-image-resize-handle:hover {
          background: #2563eb !important;
          transform: scale(1.1);
        }
        
        /* Display de tamanho */
        .rich-text-editor .ql-image-resize-display {
          background: rgba(0,0,0,0.8) !important;
          color: white !important;
          border: none !important;
          border-radius: 4px !important;
          font-size: 12px !important;
          padding: 4px 8px !important;
          font-family: monospace !important;
        }
        
        .rich-text-editor .ql-editor p {
          margin-bottom: 8px;
        }
        
        .rich-text-editor .ql-editor h1,
        .rich-text-editor .ql-editor h2,
        .rich-text-editor .ql-editor h3 {
          margin-bottom: 12px;
          margin-top: 16px;
        }
        
        .rich-text-editor .ql-editor ul,
        .rich-text-editor .ql-editor ol {
          margin-bottom: 12px;
        }
        
        /* Responsividade da toolbar */
        @media (max-width: 640px) {
          .rich-text-editor .ql-toolbar {
            padding: 4px;
          }
          
          .rich-text-editor .ql-formats {
            margin-right: 8px;
          }
        }
        
        /* Melhorar aparência dos botões */
        .rich-text-editor .ql-toolbar button {
          border-radius: 3px;
          margin: 1px;
        }
        
        .rich-text-editor .ql-toolbar button:hover {
          background-color: #e5e7eb;
        }
        
        .rich-text-editor .ql-toolbar button.ql-active {
          background-color: #3b82f6;
          color: white;
        }
        
        /* Placeholder styling */
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        
        /* Indicador de redimensionamento ativo */
        .rich-text-editor.resizing .ql-editor {
          pointer-events: none;
        }
        
        .rich-text-editor.resizing .ql-editor img {
          transition: none;
        }
        
        /* Smooth scrolling quando o editor cresce */
        .rich-text-editor {
          scroll-behavior: smooth;
        }
      `}</style>
      
      {/* Indicador visual durante redimensionamento */}
      {isResizing && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs z-10">
          <i className="fas fa-expand-arrows-alt mr-1"></i>
          Ajustando tamanho...
        </div>
      )}
    </div>
  )
}

export default RichTextEditor