import React from 'react'
import RichTextEditor from '../RichTextEditor'
import { getAlternativeLetter } from '../../utils/pdfUtils.tsx'

interface CreateItemTabProps {
  dashboard: any
}

const CreateItemTab: React.FC<CreateItemTabProps> = ({ dashboard }) => {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-user text-xs text-gray-500 mr-1"></i>
            Autor *
          </label>
          <input
            type="text"
            value={dashboard.newItemData.autor}
            onChange={(e) => dashboard.handleNewItemDataChange("autor", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do autor do item"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-graduation-cap text-xs text-gray-500 mr-1"></i>
            Etapa de Ensino *
          </label>
          <select
            value={dashboard.newItemData.etapaEnsino}
            onChange={(e) => dashboard.handleNewItemDataChange("etapaEnsino", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma etapa</option>
            <option value="ensino_infantil">Ensino Infantil</option>
            <option value="ef_anos_iniciais">E.F. Anos Iniciais</option>
            <option value="ef_anos_finais">E.F. Anos Finais</option>
            <option value="ensino_medio">Ensino Médio</option>
            <option value="ensino_tecnico">Ensino Técnico</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-book text-xs text-gray-500 mr-1"></i>
            Disciplina *
          </label>
          <select
            value={dashboard.newItemData.disciplina}
            onChange={(e) => dashboard.handleNewItemDataChange("disciplina", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma disciplina</option>
            <option value="matematica">Matemática</option>
            <option value="lingua_portuguesa">Língua Portuguesa</option>
            <option value="arte">Arte</option>
            <option value="historia">História</option>
            <option value="geografia">Geografia</option>
            <option value="ciencias">Ciências</option>
            <option value="fisica">Física</option>
            <option value="quimica">Química</option>
            <option value="biologia">Biologia</option>
            <option value="ingles">Inglês</option>
            <option value="espanhol">Espanhol</option>
            <option value="filosofia">Filosofia</option>
            <option value="sociologia">Sociologia</option>
            <option value="educacao_fisica">Educação Física</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-list text-xs text-gray-500 mr-1"></i>
            Tipo de Item *
          </label>
          <select
            value={dashboard.newItemData.tipoItem}
            onChange={(e) => {
              const newType = e.target.value
              if (newType === "multipla_escolha") {
                dashboard.setNewItemData((prev: any) => ({
                  ...prev,
                  tipoItem: newType,
                  alternativas: ["", "", "", ""], // 4 alternativas padrão
                  respostaCorreta: ""
                }))
              } else if (newType === "verdadeiro_falso") {
                dashboard.setNewItemData((prev: any) => ({
                  ...prev,
                  tipoItem: newType,
                  afirmativas: ["", ""], // Apenas 2 afirmativas obrigatórias
                  afirmativasExtras: [],
                  gabaritoAfirmativas: ["", ""],
                  gabaritoAfirmativasExtras: [],
                  respostaCorreta: ""
                }))
              } else {
                dashboard.handleNewItemDataChange("tipoItem", newType)
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecione um tipo</option>
            <option value="multipla_escolha">Múltipla Escolha</option>
            <option value="verdadeiro_falso">Verdadeiro ou Falso</option>
            <option value="discursiva">Discursiva</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            <i className="fas fa-bullseye text-xs text-gray-500 mr-1"></i>
            Descritor ou Matriz de Referência *
          </label>
          <div className="relative ml-2">
            <button
              type="button"
              onClick={dashboard.toggleDescriptorTooltip}
              className="text-blue-600 hover:text-blue-500 transition-colors"
            >
              <i className="fas fa-question-circle text-sm"></i>
            </button>
            {dashboard.showDescriptorTooltip && (
              <div className="absolute left-0 top-6 z-10 w-64 md:w-80 p-3 bg-gray-900 text-white text-xs md:text-sm rounded-lg shadow-lg">
                <p className="mb-2">
                  Enunciado que define o conhecimento e/ou habilidade esperada que o estudante
                  demonstre ao responder o item.
                </p>
                <a
                  href="/guia_elaboracao.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200 underline"
                >
                  Manual INEP para mais informações
                </a>
              </div>
            )}
          </div>
        </div>
        <textarea
          value={dashboard.newItemData.descritor}
          onChange={(e) => dashboard.handleNewItemDataChange("descritor", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Descreva o que este item avalia..."
          required
        />
      </div>

      {/* Editor de Texto Rico com Quill.js */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-edit text-xs text-gray-500 mr-1"></i>
          Texto do Item * 
          <span className="text-xs text-blue-600 ml-2">
            ✨ Editor de texto rico com imagens!
          </span>
        </label>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
          <p className="text-xs text-blue-700">
            <i className="fas fa-info-circle mr-1"></i>
            <strong>Editor de Texto Rico:</strong> Use a barra de ferramentas para formatar texto, inserir imagens, criar listas e muito mais. 
            Clique no ícone de imagem na toolbar para adicionar imagens diretamente no texto. As imagens podem ser redimensionadas clicando nelas.
          </p>
        </div>
        
        <RichTextEditor
          value={dashboard.newItemData.textoItem}
          onChange={(value) => dashboard.handleNewItemDataChange("textoItem", value)}
          placeholder="Digite o texto da questão aqui. Use a barra de ferramentas para formatar e inserir imagens..."
          height="250px"
        />
      
        {/* Espaço adicional para evitar sobreposição */}
        <div className="h-4"></div>
      </div>

      {/* ENHANCED: Quantidade de linhas para discursiva (máximo 45) */}
      {dashboard.newItemData.tipoItem === "discursiva" && (
        <div className="question-form-section">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-align-left text-xs text-gray-500 mr-1"></i>
            Quantidade de linhas para resposta *
          </label>
          <input
            type="number"
            min="1"
            max="45"
            value={dashboard.newItemData.quantidadeLinhas}
            onChange={(e) => dashboard.handleNewItemDataChange("quantidadeLinhas", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 5 (máximo 45)"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Limite máximo: 45 linhas</p>
        </div>
      )}

      {/* ENHANCED: Múltipla escolha com alternativas dinâmicas (4-10) */}
      {dashboard.newItemData.tipoItem === "multipla_escolha" && (
        <div className="multiple-choice-section">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-list-ol text-xs text-gray-500 mr-1"></i>
            Opções de resposta *
          </label>
          <div className="alternatives-list">
            <div className="space-y-2 md:space-y-3">
            {dashboard.newItemData.alternativas.map((alternativa: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternativa {getAlternativeLetter(index)}:
                  </label>
                  <input
                    type="text"
                    value={alternativa}
                    onChange={(e) => dashboard.handleAlternativeChange(index, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Digite a alternativa ${getAlternativeLetter(index)}...`}
                    required
                  />
                </div>
                {index >= 4 && (
                  <button
                    type="button"
                    onClick={() => dashboard.removeAlternative(index)}
                    className="bg-red-50 text-red-600 px-2 py-2 rounded-md hover:bg-red-100 transition-colors mt-6 border border-red-200 flex-shrink-0"
                  >
                    <i className="fas fa-minus text-xs"></i>
                  </button>
                )}
              </div>
            ))}
            </div>
            
            {dashboard.newItemData.alternativas.length < 10 && (
              <button
                type="button"
                onClick={dashboard.addAlternative}
                className="bg-green-50 text-green-600 px-3 py-2 rounded-md hover:bg-green-100 transition-colors text-sm border border-green-200 w-full alternative-button"
              >
                <i className="fas fa-plus mr-1 text-xs"></i>
                Adicionar alternativa {getAlternativeLetter(dashboard.newItemData.alternativas.length)}
              </button>
            )}
          </div>

          <div className="correct-answer-section">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-check-circle text-xs text-gray-500 mr-1"></i>
              Resposta Correta:
            </label>
            <select
              value={dashboard.newItemData.respostaCorreta}
              onChange={(e) => dashboard.handleNewItemDataChange("respostaCorreta", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione a resposta correta</option>
              {dashboard.newItemData.alternativas.map((_: string, index: number) => (
                <option key={index} value={getAlternativeLetter(index)}>
                  {getAlternativeLetter(index)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ENHANCED: Verdadeiro/Falso com afirmativas dinâmicas (5-20) */}
      {dashboard.newItemData.tipoItem === "verdadeiro_falso" && (
        <div className="space-y-3 md:space-y-4 question-form-section">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-list-ul text-xs text-gray-500 mr-1"></i>
              Afirmativas * (mínimo 2)
            </label>
            
            {/* Afirmativas obrigatórias (sempre visíveis - apenas 2) */}
            <div className="space-y-3 mb-4">
              {dashboard.newItemData.afirmativas.map((afirmativa: string, index: number) => (
                <div key={index} className="space-y-2 bg-blue-50 p-3 rounded border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <i className="fas fa-star text-blue-500 mr-1"></i>
                    Afirmativa {index + 1} *
                  </label>
                  <input
                    type="text"
                    value={afirmativa}
                    onChange={(e) => dashboard.handleAfirmativaChange(index, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Digite a afirmativa ${index + 1}...`}
                    required
                  />
                  <div className="ml-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Gabarito da afirmativa {index + 1}:
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`gabarito_${index}`}
                          value="V"
                          checked={dashboard.newItemData.gabaritoAfirmativas?.[index] === "V"}
                          onChange={(e) => dashboard.handleGabaritoAfirmativaChange(index, e.target.value)}
                          className="mr-1 h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300"
                        />
                        <span className="text-xs text-green-700 font-medium">Verdadeiro</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`gabarito_${index}`}
                          value="F"
                          checked={dashboard.newItemData.gabaritoAfirmativas?.[index] === "F"}
                          onChange={(e) => dashboard.handleGabaritoAfirmativaChange(index, e.target.value)}
                          className="mr-1 h-3 w-3 text-red-600 focus:ring-red-500 border-gray-300"
                        />
                        <span className="text-xs text-red-700 font-medium">Falso</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Afirmativas extras (opcionais - inicialmente ocultas) */}
            {dashboard.newItemData.afirmativasExtras.length > 0 && (
              <div className="space-y-3 mb-4">
                <div className="text-xs font-medium text-gray-600 mb-2 bg-green-50 p-2 rounded border border-green-200">
                  <i className="fas fa-plus-circle mr-1 text-green-600"></i>
                  Afirmativas adicionais (opcionais):
                </div>
                
                {dashboard.newItemData.afirmativasExtras.map((afirmativa: string, index: number) => (
                  <div key={`extra-${index}`} className="space-y-2 bg-green-50 p-3 rounded border border-green-200">
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <i className="fas fa-plus text-green-600 mr-1"></i>
                          Afirmativa {dashboard.newItemData.afirmativas.length + index + 1}:
                        </label>
                        <input
                          type="text"
                          value={afirmativa}
                          onChange={(e) => dashboard.handleAfirmativaChange(index, e.target.value, true)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Digite a afirmativa ${dashboard.newItemData.afirmativas.length + index + 1}...`}
                        />
                      </div>
                      <button
                        onClick={() => dashboard.removeAfirmativa(index)}
                        className="bg-red-50 text-red-600 px-3 py-2 rounded-md hover:bg-red-100 transition-colors flex-shrink-0 border border-red-200"
                        title="Remover esta afirmativa"
                      >
                        <i className="fas fa-minus text-xs"></i>
                      </button>
                    </div>
                    <div className="ml-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Gabarito da afirmativa {dashboard.newItemData.afirmativas.length + index + 1}:
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`gabarito_extra_${index}`}
                            value="V"
                            checked={dashboard.newItemData.gabaritoAfirmativasExtras?.[index] === "V"}
                            onChange={(e) => dashboard.handleGabaritoAfirmativaExtraChange(index, e.target.value)}
                            className="mr-1 h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300"
                          />
                          <span className="text-xs text-green-700 font-medium">Verdadeiro</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`gabarito_extra_${index}`}
                            value="F"
                            checked={dashboard.newItemData.gabaritoAfirmativasExtras?.[index] === "F"}
                            onChange={(e) => dashboard.handleGabaritoAfirmativaExtraChange(index, e.target.value)}
                            className="mr-1 h-3 w-3 text-red-600 focus:ring-red-500 border-gray-300"
                          />
                          <span className="text-xs text-red-700 font-medium">Falso</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botão para adicionar afirmativas extras */}
            {(dashboard.newItemData.afirmativas.length + dashboard.newItemData.afirmativasExtras.length) < 20 && (
              <button
                onClick={dashboard.addAfirmativa}
                className="bg-green-50 text-green-600 px-3 md:px-4 py-2 rounded-md hover:bg-green-100 transition-colors text-sm border border-green-200 w-full"
              >
                <i className="fas fa-plus mr-1 text-xs"></i>
                Adicionar afirmativa {dashboard.newItemData.afirmativas.length + dashboard.newItemData.afirmativasExtras.length + 1}
                <span className="text-xs ml-2 text-gray-500">
                  ({dashboard.newItemData.afirmativas.length + dashboard.newItemData.afirmativasExtras.length}/20 afirmativas)
                </span>
              </button>
            )}
            
            {/* Informação sobre o limite */}
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <i className="fas fa-info-circle mr-1"></i>
              <strong>Regras:</strong> 2 afirmativas obrigatórias sempre visíveis. Máximo 20 afirmativas total.
              Use o botão "+\" para adicionar mais afirmativas conforme necessário.
            </div>
          </div>
        </div>
      )}

      {/* Campo Justificativas movido para baixo */}
      <div className="question-form-section">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-clipboard-list text-xs text-gray-500 mr-1"></i>
          Justificativas do item para correção e análise das respostas *
        </label>
        <textarea
          value={dashboard.newItemData.justificativas}
          onChange={(e) => dashboard.handleNewItemDataChange("justificativas", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Explique as justificativas para as respostas..."
          required
        />
      </div>

      {/* ENHANCED: Botões com feedback de salvamento */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 md:space-x-4">
        <button
          onClick={dashboard.handleCancelNewItem}
          className="flex items-center justify-center text-gray-600 py-2 px-6 rounded-md hover:bg-gray-100 transition-colors text-sm border border-gray-300"
        >
          <i className="fas fa-times mr-2 text-xs"></i>
          Cancelar
        </button>
        <button 
          onClick={dashboard.handleSaveItem}
          className="flex items-center justify-center font-medium bg-blue-600 text-white py-2 px-12 rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <i className="fas fa-save mr-2 text-xs"></i>
          Salvar Item
        </button>
      </div>
    </div>
  )
}

export default CreateItemTab