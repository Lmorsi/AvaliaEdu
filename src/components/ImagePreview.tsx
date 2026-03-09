import React, { useState } from 'react'

interface ImagePreviewProps {
  image: any
  onResize: (imageId: number, newWidth: number, newHeight: number) => void
  onRemove: (imageId: number) => void
  startResize: (imageId: number, direction: string, event: React.MouseEvent) => void
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ image, onResize, onRemove, startResize }) => {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (direction: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    startResize(image.id, direction, e)
  }

  return (
    <div 
      className="relative inline-block border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 p-2 m-1"
      style={{ 
        minWidth: '60px', 
        minHeight: '50px',
        userSelect: 'none'
      }}
    >
      {/* Imagem */}
      <img
        src={URL.createObjectURL(image.file)}
        alt={`Preview ${image.id}`}
        style={{
          width: `${image.width}px`,
          height: `${image.height}px`,
          maxWidth: '500px',
          maxHeight: '400px',
          objectFit: 'cover',
          display: 'block',
          borderRadius: '4px',
          pointerEvents: 'none'
        }}
        draggable={false}
      />

      {/* Handles de redimensionamento */}
      {/* Cantos */}
      <div
        className="absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-nw-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ top: '-6px', left: '-6px' }}
        onMouseDown={(e) => handleMouseDown('top-left', e)}
        title="Redimensionar (canto superior esquerdo)"
      />
      <div
        className="absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-ne-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ top: '-6px', right: '-6px' }}
        onMouseDown={(e) => handleMouseDown('top-right', e)}
        title="Redimensionar (canto superior direito)"
      />
      <div
        className="absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-se-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ bottom: '-6px', right: '-6px' }}
        onMouseDown={(e) => handleMouseDown('bottom-right', e)}
        title="Redimensionar (canto inferior direito)"
      />
      <div
        className="absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-sw-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ bottom: '-6px', left: '-6px' }}
        onMouseDown={(e) => handleMouseDown('bottom-left', e)}
        title="Redimensionar (canto inferior esquerdo)"
      />

      {/* Handles laterais */}
      <div
        className="absolute w-3 h-6 bg-blue-600 border-2 border-white rounded cursor-ew-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ top: '50%', right: '-6px', transform: 'translateY(-50%)' }}
        onMouseDown={(e) => handleMouseDown('right', e)}
        title="Redimensionar (lateral direita)"
      />
      <div
        className="absolute w-3 h-6 bg-blue-600 border-2 border-white rounded cursor-ew-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ top: '50%', left: '-6px', transform: 'translateY(-50%)' }}
        onMouseDown={(e) => handleMouseDown('left', e)}
        title="Redimensionar (lateral esquerda)"
      />
      <div
        className="absolute w-6 h-3 bg-blue-600 border-2 border-white rounded cursor-ns-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)' }}
        onMouseDown={(e) => handleMouseDown('top', e)}
        title="Redimensionar (superior)"
      />
      <div
        className="absolute w-6 h-3 bg-blue-600 border-2 border-white rounded cursor-ns-resize shadow-md hover:bg-blue-700 transition-colors"
        style={{ bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }}
        onMouseDown={(e) => handleMouseDown('bottom', e)}
        title="Redimensionar (inferior)"
      />

      {/* Botão remover */}
      <button
        onClick={() => onRemove(image.id)}
        className="absolute w-6 h-6 bg-red-500 text-white border-2 border-white rounded-full cursor-pointer hover:bg-red-600 transition-colors flex items-center justify-center text-xs font-bold shadow-md"
        style={{ top: '-8px', right: '-8px' }}
        title="Remover imagem"
      >
        ×
      </button>

      {/* Info da imagem */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 text-center rounded-b"
        style={{ fontSize: '10px' }}
      >
        {image.width}×{image.height}px
      </div>

      {/* Indicador de arraste */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-200 bg-opacity-50 rounded flex items-center justify-center">
          <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
            Redimensionando...
          </div>
        </div>
      )}
    </div>
  )
}

export default ImagePreview