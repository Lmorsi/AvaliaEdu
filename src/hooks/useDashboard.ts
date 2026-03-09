import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Item, Assessment } from '../lib/supabase'

export const useDashboard = (userId: string | undefined) => {
  const { user: authUser } = useAuth()
  // Estados principais
  const [activeTab, setActiveTab] = useState({
    items: "search-items",
    assessments: "search-assessments",
    grading: "manage-classes",
    gradingDashboard: "grading",
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null)

  // Estados para filtros de pesquisa de itens
  const [itemFilters, setItemFilters] = useState({
    keywords: "",
    subject: "",
    questionTypes: ["Todas"],
  })

  // Estados para filtros do modal "Gerenciar Meus Itens"
  const [myItemsFilters, setMyItemsFilters] = useState({
    searchTerm: "",
    discipline: "",
    type: "",
  })

  const [filteredSavedItems, setFilteredSavedItems] = useState<any[]>([])
  const [myItemsCurrentPage, setMyItemsCurrentPage] = useState(1)
  const myItemsPerPage = 10

  const [assessmentFilters, setAssessmentFilters] = useState({
    keywords: "",
    dateFrom: "",
    dateTo: "",
    assessmentTypes: ["Todas"],
  })

  const [assessmentData, setAssessmentData] = useState({
    professor: "",
    turma: "",
    data: "",
    instrucoes: "",
    headerImage: null,
    useImageAsHeader: true,
    imageWidth: 190,
    imageHeight: 40,
    headerImageWidth: 190,
    headerImageHeight: 60,
    tipoAvaliacao: "",
    mostrarTipoAvaliacao: true,
    nomeEscola: "",
    componenteCurricular: "",
    colunas: "1",
    layoutPaginas: "pagina2", // "pagina2" ou "pagina3"
    nomeAvaliacao: "", // Novo campo para nome personalizado da avaliação
  })

  // Estados para preview com edição direta
  const [previewData, setPreviewData] = useState({
    professor: "",
    turma: "",
    data: "",
    instrucoes: "",
    nomeEscola: "",
    componenteCurricular: "",
  })

  const [showPreview, setShowPreview] = useState(false)
  const [showDescriptorTooltip, setShowDescriptorTooltip] = useState(false)
  const [showPDFColumnsModal, setShowPDFColumnsModal] = useState(false)
  const [previewColumns, setPreviewColumns] = useState("1")

  // Estados para criar novo item
  const [newItemData, setNewItemData] = useState({
    autor: "",
    disciplina: "",
    etapaEnsino: "",
    tipoItem: "",
    descritor: "",
    textoItem: "",
    justificativas: "",
    alternativas: ["", "", "", ""],
    respostaCorreta: "",
    justificativa: "",
    nivel: "",
    quantidadeLinhas: "5",
    afirmativas: ["", ""],
    afirmativasExtras: [],
    gabaritoAfirmativas: ["", ""],
    gabaritoAfirmativasExtras: [],
  })

  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showGradingModal, setShowGradingModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showAssessmentSelectionModal, setShowAssessmentSelectionModal] = useState(false)

  // Estados para controlar se a pesquisa foi realizada
  const [hasSearched, setHasSearched] = useState({
    items: false,
    assessments: false,
  })

  // Estados para armazenar resultados das pesquisas
  const [searchResults, setSearchResults] = useState({
    items: [],
    assessments: [],
  })

  // Lista de itens salvos
  const [savedItems, setSavedItems] = useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  // Lista de itens selecionados para a avaliação
  const [selectedItemsForAssessment, setSelectedItemsForAssessment] = useState([])

  // Estado para item selecionado para visualização
  const [selectedItem, setSelectedItem] = useState(null)

  // Estado para controlar se as questões foram embaralhadas
  const [questionsShuffled, setQuestionsShuffled] = useState(false)

  // Estado para controlar drag and drop
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // Estados para avaliações salvas
  const [savedAssessments, setSavedAssessments] = useState<any[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false)

  // Estados para perfil de usuário
  const [userProfile, setUserProfile] = useState({
    email: authUser?.email || 'demo@escola.com',
    name: authUser?.name || 'Professor Demo',
    institution: ''
  })

  // Atualizar perfil quando usuário autenticado mudar
  useEffect(() => {
    if (authUser) {
      setUserProfile((prev) => ({
        ...prev,
        email: authUser.email || prev.email,
        name: authUser.name || prev.name
      }))
    }
  }, [authUser?.email, authUser?.name, authUser?.id])

  // Estado para rastrear itens adicionados
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set())

  // Carregar itens ao montar ou quando userId mudar
  useEffect(() => {
    if (userId) {
      loadItems()
      loadAssessments()
    }
  }, [userId])

  // Função para carregar itens do banco
  const loadItems = async () => {
    if (!userId) return

    setIsLoadingItems(true)
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedItems = (data || []).map((item: any) => ({
        ...item,
        title: `${item.descritor?.substring(0, 50) || ''}...`,
        description: `${item.texto_item?.substring(0, 100) || ''}...`,
        subject: item.disciplina || 'Não especificada'
      }))

      setSavedItems(formattedItems)
      setFilteredSavedItems(formattedItems.filter((item: any) => item.user_id === userId))
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
      alert('Erro ao carregar itens. Verifique sua conexão.')
    } finally {
      setIsLoadingItems(false)
    }
  }

  // Função para carregar avaliações do banco
  const loadAssessments = async () => {
    if (!userId) return

    setIsLoadingAssessments(true)
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedAssessments(data || [])
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
      alert('Erro ao carregar avaliações. Verifique sua conexão.')
    } finally {
      setIsLoadingAssessments(false)
    }
  }

  // Estados para correção de avaliações
  const [correctionData, setCorrectionData] = useState({
    selectedAssessmentId: null as any,
    headerData: {
      escola: '',
      turma: '',
      aluno: '',
      instrumento: ''
    },
    questions: [] as any[]
  })

  // Função auxiliar para chamadas à API do PDF
  const callPdfApi = useCallback(async (endpoint: string, data: any) => {
    // Transformar itens de snake_case para camelCase para o servidor
    const transformedItems = (selectedItemsForAssessment || []).map((item: any) => ({
      ...item,
      tipoItem: item.tipo_item || item.tipoItem,
      textoItem: item.texto_item || item.textoItem,
      etapaEnsino: item.etapa_ensino || item.etapaEnsino,
      respostaCorreta: item.resposta_correta || item.respostaCorreta,
      quantidadeLinhas: item.quantidade_linhas || item.quantidadeLinhas,
      afirmativasExtras: item.afirmativas_extras || item.afirmativasExtras,
      gabaritoAfirmativas: item.gabarito_afirmativas || item.gabaritoAfirmativas,
      gabaritoAfirmativasExtras: item.gabarito_afirmativas_extras || item.gabaritoAfirmativasExtras,
    }))

    const finalData = {
      ...assessmentData,
      ...previewData,
      selectedItems: transformedItems,
      columns: data.columns || assessmentData.colunas,
    }

    // Converter imagem do cabeçalho para base64 se existir
    if (finalData.headerImage) {
      const reader = new FileReader()
      const imageBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(finalData.headerImage)
      })
      finalData.headerImage = imageBase64
    }

    // Tentar diferentes URLs do servidor
    const serverUrls = [
      `https://bolt-1212-production.up.railway.app/api/${endpoint}`,
      `https://avaliacao-pdf-server.onrender.com/api/${endpoint}`,
      `https://avaliacao-pdf-server.railway.app/api/${endpoint}`,
      `http://localhost:3001/api/${endpoint}`,
      `https://avaliacao-pdf-server.herokuapp.com/api/${endpoint}`
    ]
    
    let response = null
    let lastError = null
    
    for (const url of serverUrls) {
      try {
        console.log(`Tentando conectar com: ${url}`)
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalData),
          signal: AbortSignal.timeout(30000)
        })
        
        if (response.ok) {
          console.log(`Conectado com sucesso: ${url}`)
          break
        } else {
          throw new Error(`Servidor retornou status ${response.status}`)
        }
      } catch (error) {
        console.warn(`Falha ao conectar com ${url}:`, error)
        lastError = error
        response = null
      }
    }

    if (!response) {
      throw new Error(`Não foi possível conectar com nenhum servidor. Último erro: ${lastError?.message}`)
    }

    return response
  }, [assessmentData, previewData, selectedItemsForAssessment])

  // Handlers principais
  const handleTabChange = useCallback((section: string, tab: string) => {
    setActiveTab((prev: any) => ({ ...prev, [section]: tab }))
  }, [])

  const openModal = useCallback((modalId: string) => {
    setActiveModal(modalId)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    setShowPreview(false)
    setShowCancelConfirmation(false)
    setShowPDFColumnsModal(false)
    setShowSaveSuccess(false)
    setSelectedItem(null)
  }, [])

  const handleModalOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }, [closeModal])

  const toggleDescriptorTooltip = useCallback(() => {
    setShowDescriptorTooltip(!showDescriptorTooltip)
  }, [showDescriptorTooltip])

  const handleQuestionTypeToggle = useCallback((type: string) => {
    setItemFilters((prev: any) => {
      let newTypes = [...prev.questionTypes]
      if (type === "Todas") {
        newTypes = ["Todas"]
      } else {
        newTypes = newTypes.filter((t: string) => t !== "Todas")
        if (newTypes.includes(type)) {
          newTypes = newTypes.filter((t: string) => t !== type)
        } else {
          newTypes.push(type)
        }
        if (newTypes.length === 0) {
          newTypes = ["Todas"]
        }
      }
      return { ...prev, questionTypes: newTypes }
    })
  }, [])

  const handleAssessmentTypeToggle = useCallback((type: string) => {
    setAssessmentFilters((prev: any) => {
      let newTypes = [...prev.assessmentTypes]
      if (type === "Todas") {
        newTypes = ["Todas"]
      } else {
        newTypes = newTypes.filter((t: string) => t !== "Todas")
        if (newTypes.includes(type)) {
          newTypes = newTypes.filter((t: string) => t !== type)
        } else {
          newTypes.push(type)
        }
        if (newTypes.length === 0) {
          newTypes = ["Todas"]
        }
      }
      return { ...prev, assessmentTypes: newTypes }
    })
  }, [])

  const handleItemSearch = useCallback(() => {
    console.log("Pesquisando itens com filtros:", itemFilters)
    setHasSearched((prev: any) => ({ ...prev, items: true }))

    let filteredItems = [...savedItems]

    if (itemFilters.keywords) {
      filteredItems = filteredItems.filter((item: any) =>
        (item.texto_item || '').toLowerCase().includes(itemFilters.keywords.toLowerCase()) ||
        (item.descritor || '').toLowerCase().includes(itemFilters.keywords.toLowerCase()) ||
        (item.disciplina || '').toLowerCase().includes(itemFilters.keywords.toLowerCase())
      )
    }

    if (itemFilters.subject && itemFilters.subject !== "") {
      filteredItems = filteredItems.filter((item: any) =>
        item.disciplina === itemFilters.subject
      )
    }

    if (!itemFilters.questionTypes.includes("Todas")) {
      filteredItems = filteredItems.filter((item: any) => {
        const tipoMap: any = {
          "multipla_escolha": "Múltipla Escolha",
          "verdadeiro_falso": "Verdadeiro/Falso",
          "discursiva": "Discursiva"
        }
        return itemFilters.questionTypes.includes(tipoMap[item.tipo_item])
      })
    }

    setSearchResults((prev: any) => ({ ...prev, items: filteredItems }))
  }, [itemFilters, savedItems])

  const handleSearchMyItems = useCallback(() => {
    console.log("Pesquisando meus itens com filtros:", myItemsFilters)

    let filtered = savedItems.filter((item: any) => item.user_id === userId)

    // Filtrar por termo de busca (descritor ou texto)
    if (myItemsFilters.searchTerm && myItemsFilters.searchTerm.trim() !== "") {
      filtered = filtered.filter((item: any) =>
        (item.descritor || '').toLowerCase().includes(myItemsFilters.searchTerm.toLowerCase()) ||
        (item.texto_item || '').toLowerCase().includes(myItemsFilters.searchTerm.toLowerCase())
      )
    }

    // Filtrar por disciplina
    if (myItemsFilters.discipline && myItemsFilters.discipline !== "") {
      filtered = filtered.filter((item: any) =>
        item.disciplina === myItemsFilters.discipline
      )
    }

    // Filtrar por tipo de item
    if (myItemsFilters.type && myItemsFilters.type !== "") {
      filtered = filtered.filter((item: any) =>
        item.tipo_item === myItemsFilters.type
      )
    }

    setFilteredSavedItems(filtered)
    setMyItemsCurrentPage(1) // Reset para primeira página ao fazer nova busca
  }, [myItemsFilters, savedItems, userId])

  const handleAssessmentSearch = useCallback(() => {
    console.log("Pesquisando avaliações com filtros:", assessmentFilters)
    setHasSearched((prev: any) => ({ ...prev, assessments: true }))

    let filteredAssessments = [...savedAssessments]

    if (assessmentFilters.keywords) {
      filteredAssessments = filteredAssessments.filter((assessment: any) =>
        (assessment.nome_avaliacao || '').toLowerCase().includes(assessmentFilters.keywords.toLowerCase()) ||
        (assessment.tipo_avaliacao || '').toLowerCase().includes(assessmentFilters.keywords.toLowerCase()) ||
        (assessment.professor || '').toLowerCase().includes(assessmentFilters.keywords.toLowerCase()) ||
        (assessment.turma || '').toLowerCase().includes(assessmentFilters.keywords.toLowerCase())
      )
    }

    if (assessmentFilters.dateFrom) {
      filteredAssessments = filteredAssessments.filter((assessment: any) => {
        const assessmentDate = new Date(assessment.created_at).toISOString().split('T')[0]
        return assessmentDate >= assessmentFilters.dateFrom
      })
    }

    if (assessmentFilters.dateTo) {
      filteredAssessments = filteredAssessments.filter((assessment: any) => {
        const assessmentDate = new Date(assessment.created_at).toISOString().split('T')[0]
        return assessmentDate <= assessmentFilters.dateTo
      })
    }

    if (!assessmentFilters.assessmentTypes.includes("Todas")) {
      filteredAssessments = filteredAssessments.filter((assessment: any) =>
        assessmentFilters.assessmentTypes.includes(assessment.tipo_avaliacao)
      )
    }

    const formattedResults = filteredAssessments.map((assessment: any) => ({
      id: assessment.id,
      title: assessment.nome_avaliacao || assessment.tipo_avaliacao || 'Avaliação sem nome',
      description: `${assessment.turma || 'Sem turma'} - ${assessment.selectedItems?.length || 0} questões`,
      date: new Date(assessment.created_at).toLocaleDateString('pt-BR'),
      ...assessment
    }))

    setSearchResults((prev: any) => ({ ...prev, assessments: formattedResults }))
  }, [assessmentFilters, savedAssessments])

  const handleAddHeaderImage = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        setAssessmentData((prev: any) => ({
          ...prev,
          headerImage: file,
          useImageAsHeader: true,
        }))
      }
    }
    input.click()
  }, [])

  const addAlternative = useCallback(() => {
    if (newItemData.tipoItem === "multipla_escolha" && newItemData.alternativas.length < 10) {
      setNewItemData((prev: any) => ({
        ...prev,
        alternativas: [...prev.alternativas, ""]
      }))
    } else if (newItemData.tipoItem === "verdadeiro_falso" && (newItemData.afirmativas.length + newItemData.afirmativasExtras.length) < 20) {
      setNewItemData((prev: any) => ({
        ...prev,
        afirmativasExtras: [...prev.afirmativasExtras, ""],
        gabaritoAfirmativasExtras: [...prev.gabaritoAfirmativasExtras, ""]
      }))
    }
  }, [newItemData.tipoItem, newItemData.alternativas.length, newItemData.afirmativas.length, newItemData.afirmativasExtras.length])

  const removeAlternative = useCallback((index: number) => {
    if (newItemData.tipoItem === "multipla_escolha" && newItemData.alternativas.length > 4) {
      setNewItemData((prev: any) => ({
        ...prev,
        alternativas: prev.alternativas.filter((_: any, i: number) => i !== index)
      }))
    }
  }, [newItemData.tipoItem, newItemData.alternativas.length])

  const handleAlternativeChange = useCallback((index: number, value: string) => {
    setNewItemData((prev: any) => ({
      ...prev,
      alternativas: prev.alternativas.map((alt: string, i: number) => i === index ? value : alt)
    }))
  }, [])

  const handleSaveItem = useCallback(async () => {
    if (!userId) {
      alert("Você precisa estar autenticado para salvar itens.")
      return
    }

    // Validação básica
    if (!newItemData.autor || !newItemData.etapaEnsino || !newItemData.tipoItem ||
        !newItemData.descritor || !newItemData.textoItem || !newItemData.justificativas) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    // Validações específicas por tipo
    if (newItemData.tipoItem === "multipla_escolha") {
      if (newItemData.alternativas.some((alt: string) => alt.trim() === "") || !newItemData.respostaCorreta) {
        alert("Por favor, preencha todas as alternativas e selecione a resposta correta.")
        return
      }
    }

    if (newItemData.tipoItem === "verdadeiro_falso") {
      const todasAfirmativas = [...newItemData.afirmativas, ...newItemData.afirmativasExtras]
      const todosGabaritos = [...newItemData.gabaritoAfirmativas, ...newItemData.gabaritoAfirmativasExtras]

      if (todasAfirmativas.some((afirm: string) => afirm.trim() === "")) {
        alert("Por favor, preencha todas as afirmativas.")
        return
      }

      if (todosGabaritos.some((gab: string, index: number) => {
        const afirmativaCorrespondente = todasAfirmativas[index]
        return afirmativaCorrespondente && afirmativaCorrespondente.trim() !== "" && (!gab || gab.trim() === "")
      })) {
        alert("Por favor, defina o gabarito (V ou F) para todas as afirmativas preenchidas.")
        return
      }
    }

    try {
      // Salvar item no banco de dados
      const { error } = await supabase
        .from('items')
        .insert([{
          user_id: userId,
          autor: newItemData.autor,
          disciplina: newItemData.disciplina,
          etapa_ensino: newItemData.etapaEnsino,
          tipo_item: newItemData.tipoItem,
          descritor: newItemData.descritor,
          texto_item: newItemData.textoItem,
          justificativas: newItemData.justificativas,
          alternativas: newItemData.alternativas,
          resposta_correta: newItemData.respostaCorreta,
          justificativa: newItemData.justificativa,
          nivel: newItemData.nivel,
          quantidade_linhas: newItemData.quantidadeLinhas,
          afirmativas: newItemData.afirmativas,
          afirmativas_extras: newItemData.afirmativasExtras,
          gabarito_afirmativas: newItemData.gabaritoAfirmativas,
          gabarito_afirmativas_extras: newItemData.gabaritoAfirmativasExtras
        }])

      if (error) throw error

      alert('Item salvo com sucesso!')

      // Recarregar itens do banco
      await loadItems()

      // Reset do formulário
      setNewItemData({
        autor: "",
        disciplina: "",
        etapaEnsino: "",
        tipoItem: "",
        descritor: "",
        textoItem: "",
        justificativas: "",
        alternativas: ["", "", "", ""],
        respostaCorreta: "",
        justificativa: "",
        nivel: "",
        quantidadeLinhas: "5",
        afirmativas: ["", ""],
        afirmativasExtras: [],
        gabaritoAfirmativas: ["", ""],
        gabaritoAfirmativasExtras: [],
      })
      setActiveTab((prev: any) => ({ ...prev, items: "search-items" }))
    } catch (error) {
      console.error('Erro ao salvar item:', error)
      alert('Erro ao salvar item. Tente novamente.')
    }
  }, [newItemData, userId, loadItems])

  const handleViewItemDetails = useCallback((item: any) => {
    setSelectedItem(item)
    setActiveModal("item-details-modal")
  }, [])

  const handleDeleteItem = useCallback(async (itemId: number) => {
    if (!confirm('Deseja realmente excluir este item?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      alert('Item excluído com sucesso!')

      await loadItems()
    } catch (error: any) {
      console.error('Erro ao excluir item:', error)
      if (error.code === 'PGRST301' || error.message?.includes('violates row-level security policy')) {
        alert('Você não tem permissão para excluir este item. Apenas o criador pode excluí-lo.')
      } else {
        alert('Erro ao excluir item. Tente novamente.')
      }
    }
  }, [loadItems])

  const handleAddItemToAssessment = useCallback((item: any) => {
    const isAlreadyAdded = selectedItemsForAssessment.some((selectedItem: any) => selectedItem.id === item.id)

    if (isAlreadyAdded) {
      return
    }

    setSelectedItemsForAssessment((prev: any[]) => [...prev, item])
    setAddedItemIds((prev) => new Set(prev).add(item.id))

    if (activeModal === "item-details-modal") {
      closeModal()
    }
  }, [selectedItemsForAssessment, activeModal, closeModal])

  const handleRemoveItemFromAssessment = useCallback((itemId: number) => {
    setSelectedItemsForAssessment((prev: any[]) => prev.filter((item: any) => item.id !== itemId))
    setAddedItemIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(itemId)
      return newSet
    })
  }, [])

  const handleClearAllItemsFromAssessment = useCallback(() => {
    setSelectedItemsForAssessment([])
    setAddedItemIds(new Set())
    setQuestionsShuffled(false)
  }, [])

  const handleShuffleQuestions = useCallback(() => {
    if (selectedItemsForAssessment.length <= 1) {
      alert("É necessário ter pelo menos 2 questões para embaralhar.")
      return
    }

    const shuffledItems = [...selectedItemsForAssessment]
    for (let i = shuffledItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]]
    }

    setSelectedItemsForAssessment(shuffledItems)
    setQuestionsShuffled(true)
    alert(`✅ Questões embaralhadas com sucesso! Nova ordem aplicada.`)
  }, [selectedItemsForAssessment])

  const handleRestoreOriginalOrder = useCallback(() => {
    const originalOrder = [...selectedItemsForAssessment].sort((a, b) => a.id - b.id)
    setSelectedItemsForAssessment(originalOrder)
    setQuestionsShuffled(false)
    alert("✅ Ordem original restaurada!")
  }, [selectedItemsForAssessment])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, item: any, index: number) => {
    setDraggedItem({ item, index })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    
    setTimeout(() => {
      const target = e.currentTarget as HTMLElement
      target.style.opacity = '0.5'
      target.style.transform = 'rotate(2deg)'
    }, 0)
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = ''
    target.style.transform = ''
    setDraggedItem(null)
    setDragOverIndex(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.index === dropIndex) {
      setDraggedItem(null)
      setDragOverIndex(null)
      return
    }

    const newItems = [...selectedItemsForAssessment]
    const draggedItemData = newItems[draggedItem.index]
    
    newItems.splice(draggedItem.index, 1)
    const insertIndex = draggedItem.index < dropIndex ? dropIndex - 1 : dropIndex
    newItems.splice(insertIndex, 0, draggedItemData)
    
    setSelectedItemsForAssessment(newItems)
    setDraggedItem(null)
    setDragOverIndex(null)
    
    if (questionsShuffled) {
      setQuestionsShuffled(false)
    }
    
    const fromPos = draggedItem.index + 1
    const toPos = insertIndex + 1
    
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm'
    notification.innerHTML = `<i class="fas fa-check mr-2"></i>Questão movida da posição ${fromPos} para ${toPos}`
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 2000)
  }, [draggedItem, selectedItemsForAssessment, questionsShuffled])

  const handlePreview = useCallback(() => {
    setPreviewData({
      professor: assessmentData.professor,
      turma: assessmentData.turma,
      data: assessmentData.data,
      instrucoes: assessmentData.instrucoes,
      nomeEscola: assessmentData.nomeEscola,
      componenteCurricular: assessmentData.componenteCurricular,
    })
    
    setPreviewColumns(assessmentData.colunas)
    setActiveModal("preview-modal")
  }, [assessmentData])

  const handleGeneratePDF = useCallback(() => {
    setShowPDFColumnsModal(true)
    setActiveModal("pdf-columns-modal")
  }, [])

  // Função para gerar PDF usando o back-end
  const generatePDF = useCallback(async (columns: string) => {
    // Mostrar indicador de carregamento
    const loadingToast = document.createElement('div')
    loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-3'
    loadingToast.innerHTML = `
      <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
      <span>Gerando PDF...</span>
    `
    document.body.appendChild(loadingToast)
    
    try {
      const response = await callPdfApi('generate-pdf', { columns })
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      const tipoAvaliacao = assessmentData.mostrarTipoAvaliacao && assessmentData.tipoAvaliacao 
        ? assessmentData.tipoAvaliacao.toLowerCase().replace(/\s+/g, '_') 
        : 'avaliacao'
      const fileName = `${tipoAvaliacao}_${assessmentData.turma || 'nova'}_${columns}col_${new Date().toISOString().split('T')[0]}.pdf`
      
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Remover indicador de carregamento
      document.body.removeChild(loadingToast)

      // Salvar a avaliação gerada no banco de dados
      if (userId) {
        try {
          const { data: assessmentRecord, error: assessmentError } = await supabase
            .from('assessments')
            .insert([{
              user_id: userId,
              nome_avaliacao: assessmentData.nomeAvaliacao,
              professor: assessmentData.professor,
              turma: assessmentData.turma,
              data: assessmentData.data,
              instrucoes: assessmentData.instrucoes,
              header_image_url: '',
              use_image_as_header: assessmentData.useImageAsHeader,
              image_width: assessmentData.imageWidth,
              image_height: assessmentData.imageHeight,
              header_image_width: assessmentData.headerImageWidth,
              header_image_height: assessmentData.headerImageHeight,
              tipo_avaliacao: assessmentData.tipoAvaliacao,
              mostrar_tipo_avaliacao: assessmentData.mostrarTipoAvaliacao,
              nome_escola: assessmentData.nomeEscola,
              componente_curricular: assessmentData.componenteCurricular,
              colunas: columns,
              layout_paginas: assessmentData.layoutPaginas,
              selected_items: selectedItemsForAssessment,
              data_criacao: new Date().toISOString()
            }])
            .select()

          if (assessmentError) throw assessmentError

          // Recarregar avaliações do banco
          await loadAssessments()
        } catch (error) {
          console.error('Erro ao salvar avaliação:', error)
        }
      }

      closeModal()
      alert('PDF gerado com sucesso! ✅')
      
    } catch (error) {
      // Remover indicador de carregamento em caso de erro
      if (document.body.contains(loadingToast)) {
        document.body.removeChild(loadingToast)
      }
      
      console.error('Erro ao gerar PDF:', error)
      
      let errorMessage = 'Erro ao gerar PDF. '
      
      if (error.message.includes('conectar')) {
        errorMessage += '\n\n🔧 SOLUÇÃO:\n'
        errorMessage += '1. Certifique-se que o servidor está rodando:\n'
        errorMessage += '   • Abra um terminal na pasta "server"\n'
        errorMessage += '   • Execute: npm install\n'
        errorMessage += '   • Execute: npm start\n\n'
        errorMessage += '2. Ou faça deploy gratuito:\n'
        errorMessage += '   • Railway.app (recomendado)\n'
        errorMessage += '   • Heroku\n'
        errorMessage += '   • Render.com\n\n'
        errorMessage += '3. Veja as instruções completas no arquivo server/README.md'
      } else {
        errorMessage += error.message
      }
      
      alert(errorMessage)
    }
  }, [callPdfApi, assessmentData, closeModal])

  // Função para gerar preview usando o back-end
  const generatePDFPreview = useCallback(async (columns: string): Promise<string> => {
    try {
      const response = await callPdfApi('preview-pdf', { columns })
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('Erro ao gerar pré-visualização:', error)
      throw error
    }
  }, [callPdfApi])

  // Função para gerar PDF de uma avaliação salva
  const generateAssessmentPDF = useCallback(async (assessment: any): Promise<Blob> => {
    try {
      // Preparar dados da avaliação
      const assessmentDataToSend = {
        nomeAvaliacao: assessment.nomeAvaliacao || assessment.nome_avaliacao,
        nomeEscola: assessment.nomeEscola || assessment.nome_escola,
        professor: assessment.professor,
        turma: assessment.turma,
        componenteCurricular: assessment.componenteCurricular || assessment.componente_curricular,
        data: assessment.data,
        instrucoes: assessment.instrucoes,
        tipoAvaliacao: assessment.tipoAvaliacao || assessment.tipo_avaliacao,
        mostrarTipoAvaliacao: assessment.mostrarTipoAvaliacao || assessment.mostrar_tipo_avaliacao,
        colunas: assessment.colunas || '1',
        layoutPaginas: assessment.layoutPaginas || assessment.layout_paginas || 'pagina2',
        headerImage: null,
        useImageAsHeader: assessment.useImageAsHeader || assessment.use_image_as_header,
        imageWidth: assessment.imageWidth || assessment.image_width || 190,
        imageHeight: assessment.imageHeight || assessment.image_height || 40,
        columns: assessment.colunas || '1',
      }

      // Preparar itens selecionados
      const items = assessment.selectedItems || assessment.selected_items || []
      const transformedItems = items.map((item: any) => ({
        ...item,
        tipoItem: item.tipo_item || item.tipoItem,
        textoItem: item.texto_item || item.textoItem,
        descritor: item.descritor,
        itemAlternativas: item.itemAlternativas || item.item_alternativas || [],
        itemAfirmativas: item.itemAfirmativas || item.item_afirmativas || [],
        etapaEnsino: item.etapa_ensino || item.etapaEnsino,
        respostaCorreta: item.resposta_correta || item.respostaCorreta,
        quantidadeLinhas: item.quantidade_linhas || item.quantidadeLinhas,
        afirmativasExtras: item.afirmativas_extras || item.afirmativasExtras,
        gabaritoAfirmativas: item.gabarito_afirmativas || item.gabaritoAfirmativas,
        gabaritoAfirmativasExtras: item.gabarito_afirmativas_extras || item.gabaritoAfirmativasExtras,
      }))

      assessmentDataToSend.selectedItems = transformedItems

      // Tentar diferentes URLs do servidor
      const serverUrls = [
        'https://bolt-1212-production.up.railway.app/api/generate-pdf',
        'https://avaliacao-pdf-server.onrender.com/api/generate-pdf',
        'https://avaliacao-pdf-server.railway.app/api/generate-pdf',
        'http://localhost:3001/api/generate-pdf',
        'https://avaliacao-pdf-server.herokuapp.com/api/generate-pdf'
      ]

      let response = null
      let lastError = null

      for (const url of serverUrls) {
        try {
          console.log(`Tentando conectar com: ${url}`)
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(assessmentDataToSend),
            signal: AbortSignal.timeout(30000)
          })

          if (response.ok) {
            console.log(`Conectado com sucesso: ${url}`)
            break
          } else {
            throw new Error(`Servidor retornou status ${response.status}`)
          }
        } catch (err: any) {
          console.warn(`Falha ao conectar com ${url}:`, err.message)
          lastError = err
          response = null
        }
      }

      if (!response || !response.ok) {
        throw new Error('Não foi possível conectar ao servidor de PDF. Verifique se o servidor está rodando.')
      }

      return await response.blob()
    } catch (error) {
      console.error('Erro ao gerar PDF da avaliação:', error)
      throw error
    }
  }, [])

  const handleAssessmentDataChange = useCallback((field: string, value: any) => {
    setAssessmentData((prev: any) => ({ ...prev, [field]: value }))
  }, [])

  const handlePreviewDataChange = useCallback((field: string, value: any) => {
    setPreviewData((prev: any) => ({ ...prev, [field]: value }))
  }, [])

  const handleNewItemDataChange = useCallback((field: string, value: any) => {
    setNewItemData((prev: any) => ({ ...prev, [field]: value }))
  }, [])

  const handleAfirmativaChange = useCallback((index: number, value: string, isExtra = false) => {
    if (isExtra) {
      setNewItemData((prev: any) => ({
        ...prev,
        afirmativasExtras: prev.afirmativasExtras.map((item: string, i: number) => (i === index ? value : item)),
      }))
    } else {
      setNewItemData((prev: any) => ({
        ...prev,
        afirmativas: prev.afirmativas.map((item: string, i: number) => (i === index ? value : item)),
      }))
    }
  }, [])

  const handleGabaritoAfirmativaChange = useCallback((index: number, value: string) => {
    setNewItemData((prev: any) => ({
      ...prev,
      gabaritoAfirmativas: prev.gabaritoAfirmativas.map((item: string, i: number) => (i === index ? value : item)),
    }))
  }, [])

  const handleGabaritoAfirmativaExtraChange = useCallback((index: number, value: string) => {
    setNewItemData((prev: any) => ({
      ...prev,
      gabaritoAfirmativasExtras: prev.gabaritoAfirmativasExtras.map((item: string, i: number) => (i === index ? value : item)),
    }))
  }, [])

  const addAfirmativa = useCallback(() => {
    setNewItemData((prev: any) => ({
      ...prev,
      afirmativasExtras: [...prev.afirmativasExtras, ""],
      gabaritoAfirmativasExtras: [...prev.gabaritoAfirmativasExtras, ""],
    }))
  }, [])

  const removeAfirmativa = useCallback((index: number) => {
    setNewItemData((prev: any) => ({
      ...prev,
      afirmativasExtras: prev.afirmativasExtras.filter((_: string, i: number) => i !== index),
      gabaritoAfirmativasExtras: prev.gabaritoAfirmativasExtras.filter((_: string, i: number) => i !== index),
    }))
  }, [])

  const hasFormData = useCallback(() => {
    return (
      newItemData.autor !== "" ||
      newItemData.disciplina !== "" ||
      newItemData.etapaEnsino !== "" ||
      newItemData.tipoItem !== "" ||
      newItemData.descritor !== "" ||
      newItemData.textoItem !== "" ||
      newItemData.justificativas !== "" ||
      newItemData.nivel !== "" ||
      Object.values(newItemData).some((value: any) => value && value.toString().trim() !== "")
    )
  }, [newItemData])

  const handleCancelNewItem = useCallback(() => {
    if (hasFormData()) {
      setShowCancelConfirmation(true)
    } else {
      setActiveTab((prev: any) => ({ ...prev, items: "search-items" }))
    }
  }, [hasFormData])

  const confirmCancel = useCallback(() => {
    setNewItemData({
      autor: "",
      disciplina: "",
      etapaEnsino: "",
      tipoItem: "",
      descritor: "",
      textoItem: "",
      justificativas: "",
      alternativas: ["", "", "", ""],
      respostaCorreta: "",
      justificativa: "",
      nivel: "",
      quantidadeLinhas: "5",
      afirmativas: ["", ""],
      afirmativasExtras: [],
      gabaritoAfirmativas: ["", ""],
      gabaritoAfirmativasExtras: [],
    })
    setShowCancelConfirmation(false)
    setActiveTab((prev: any) => ({ ...prev, items: "search-items" }))
  }, [])

  const handleInstructionsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    handleAssessmentDataChange("instrucoes", newValue)
  }, [handleAssessmentDataChange])

  // Handlers de correção
  const handleSelectAssessmentForCorrection = useCallback((assessmentId: string) => {
    if (!assessmentId) {
      setCorrectionData({
        selectedAssessmentId: null,
        headerData: {
          escola: '',
          turma: '',
          aluno: '',
          instrumento: ''
        },
        questions: []
      })
      return
    }

    const assessment = savedAssessments.find((a: any) => a.id === parseInt(assessmentId))
    if (!assessment) return

    // Preparar questões baseadas nos itens da avaliação
    const questions = assessment.selectedItems.map((item: any) => {
      let alternatives: string[] = []
      let answersArray: boolean[] = []
      let afirmativas: string[] = []

      if (item.tipoItem === 'multipla_escolha') {
        alternatives = item.alternativas
          .filter((alt: string) => alt && alt.trim())
          .map((_: string, idx: number) => String.fromCharCode(65 + idx))
        answersArray = new Array(alternatives.length).fill(false)
      } else if (item.tipoItem === 'verdadeiro_falso') {
        // Coletar todas as afirmativas (principais + extras)
        afirmativas = [
          ...item.afirmativas,
          ...(item.afirmativasExtras || [])
        ].filter((afirm: string) => afirm && afirm.trim())

        // Coletar gabaritos correspondentes
        const gabaritos = [
          ...item.gabaritoAfirmativas,
          ...(item.gabaritoAfirmativasExtras || [])
        ].filter((gab: string, index: number) => {
          const afirmativaCorrespondente = [
            ...item.afirmativas,
            ...(item.afirmativasExtras || [])
          ][index]
          return afirmativaCorrespondente && afirmativaCorrespondente.trim()
        })

        // Para cada afirmativa, criar 2 slots (V e F)
        answersArray = new Array(afirmativas.length * 2).fill(false)
        alternatives = ['V', 'F']

        return {
          id: item.id,
          type: item.tipoItem,
          alternatives,
          afirmativas,
          answers: answersArray,
          correctAnswer: item.respostaCorreta,
          gabaritos: gabaritos
        }
      } else {
        answersArray = []
      }

      return {
        id: item.id,
        type: item.tipoItem,
        alternatives,
        afirmativas,
        answers: answersArray,
        correctAnswer: item.respostaCorreta
      }
    })

    setCorrectionData({
      selectedAssessmentId: parseInt(assessmentId),
      headerData: {
        escola: assessment.nomeEscola || '',
        turma: assessment.turma || '',
        aluno: '',
        instrumento: assessment.tipoAvaliacao || ''
      },
      questions
    })
  }, [savedAssessments])

  const handleCorrectionHeaderChange = useCallback((field: string, value: string) => {
    setCorrectionData((prev) => ({
      ...prev,
      headerData: {
        ...prev.headerData,
        [field]: value
      }
    }))
  }, [])

  const handleToggleAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setCorrectionData((prev) => {
      const newQuestions = [...prev.questions]
      const question = { ...newQuestions[questionIndex] }

      // Criar novo array de respostas
      const newAnswers = [...question.answers]
      newAnswers[answerIndex] = !newAnswers[answerIndex]

      // Atualizar questão com novo array
      question.answers = newAnswers

      newQuestions[questionIndex] = question

      return {
        ...prev,
        questions: newQuestions
      }
    })
  }, [])

  const handleClearAllAnswers = useCallback(() => {
    if (confirm('Deseja realmente limpar todas as respostas?')) {
      setCorrectionData((prev) => ({
        ...prev,
        questions: prev.questions.map((q) => ({
          ...q,
          answers: q.answers.map(() => false)
        }))
      }))
    }
  }, [])

  const handleSaveCorrection = useCallback(() => {
    // Calcular estatísticas
    let correct = 0
    let incorrect = 0
    let blank = 0
    let duplicate = 0

    correctionData.questions.forEach((question) => {
      if (question.type === 'verdadeiro_falso') {
        // Para V/F, avaliar cada afirmativa individualmente
        const numAfirmativas = question.afirmativas?.length || 0
        let afirmativasCorretas = 0
        let afirmativasIncorretas = 0
        let afirmativasDuplicadas = 0
        let afirmativasEmBranco = 0

        for (let i = 0; i < numAfirmativas; i++) {
          const vIndex = i * 2
          const fIndex = i * 2 + 1
          const markedV = question.answers[vIndex]
          const markedF = question.answers[fIndex]

          // Verificar duplicação (V e F marcados na mesma afirmativa)
          if (markedV && markedF) {
            afirmativasDuplicadas++
            afirmativasIncorretas++
          } else if (!markedV && !markedF) {
            afirmativasEmBranco++
          } else {
            // Verificar se está correta
            const gabarito = question.gabaritos?.[i]
            const respostaAluno = markedV ? 'V' : 'F'

            if (respostaAluno === gabarito) {
              afirmativasCorretas++
            } else {
              afirmativasIncorretas++
            }
          }
        }

        // Considerar a questão correta se todas as afirmativas estiverem corretas
        if (afirmativasCorretas === numAfirmativas && afirmativasDuplicadas === 0) {
          correct++
        } else if (afirmativasEmBranco === numAfirmativas) {
          blank++
        } else {
          incorrect++
          if (afirmativasDuplicadas > 0) {
            duplicate++
          }
        }
      } else if (question.type === 'multipla_escolha') {
        // Para múltipla escolha, manter lógica original
        const markedCount = question.answers.filter((a: boolean) => a).length

        if (markedCount > 1) {
          duplicate++
          incorrect++
        } else if (markedCount === 0) {
          blank++
        } else {
          // Verificar se está correta
          const markedIndex = question.answers.findIndex((a: boolean) => a)
          const markedAnswer = question.alternatives[markedIndex]

          if (markedAnswer === question.correctAnswer) {
            correct++
          } else {
            incorrect++
          }
        }
      }
    })

    const total = correctionData.questions.length
    const score = total > 0 ? ((correct / total) * 100).toFixed(1) : 0

    alert(
      `Correção salva com sucesso!\n\n` +
      `Aluno: ${correctionData.headerData.aluno}\n` +
      `Total de questões: ${total}\n` +
      `Corretas: ${correct}\n` +
      `Incorretas: ${incorrect} ${duplicate > 0 ? `(incluindo ${duplicate} com marcações duplicadas)` : ''}\n` +
      `Não respondidas: ${blank}\n` +
      `Nota: ${score}%`
    )

    closeModal()
  }, [correctionData, closeModal])

  const handleDeleteGrading = useCallback(async (gradingId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta correção? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('assessment_gradings')
        .delete()
        .eq('id', gradingId)

      if (error) throw error

      alert('Correção excluída com sucesso!')

      return true
    } catch (error) {
      console.error('Erro ao excluir correção:', error)
      alert('Erro ao excluir correção. Tente novamente.')
      return false
    }
  }, [])

  return {
    // Estados
    activeTab,
    sidebarOpen,
    activeModal,
    itemFilters,
    assessmentFilters,
    assessmentData,
    previewData,
    showPreview,
    showDescriptorTooltip,
    showPDFColumnsModal,
    previewColumns,
    newItemData,
    showCancelConfirmation,
    showSaveSuccess,
    showStudentsModal,
    showGradingModal,
    showFolderModal,
    showAssessmentSelectionModal,
    hasSearched,
    searchResults,
    savedItems,
    selectedItem,
    selectedItemsForAssessment,
    questionsShuffled,
    draggedItem,
    dragOverIndex,
    savedAssessments,
    selectedAssessment,
    userProfile,
    addedItemIds,
    correctionData,
    isLoadingItems,
    isLoadingAssessments,
    myItemsFilters,
    filteredSavedItems,
    myItemsCurrentPage,
    myItemsPerPage,

    // Setters
    setActiveTab,
    setSidebarOpen,
    setActiveModal,
    setItemFilters,
    setAssessmentFilters,
    setAssessmentData,
    setPreviewData,
    setShowPreview,
    setShowDescriptorTooltip,
    setShowPDFColumnsModal,
    setPreviewColumns,
    setNewItemData,
    setShowCancelConfirmation,
    setShowSaveSuccess,
    setShowStudentsModal,
    setShowGradingModal,
    setShowFolderModal,
    setShowAssessmentSelectionModal,
    setHasSearched,
    setSearchResults,
    setSavedItems,
    setSelectedItem,
    setSelectedItemsForAssessment,
    setQuestionsShuffled,
    setDraggedItem,
    setDragOverIndex,
    setSavedAssessments,
    setSelectedAssessment,
    setUserProfile,
    setAddedItemIds,
    setCorrectionData,
    setMyItemsFilters,
    setFilteredSavedItems,
    setMyItemsCurrentPage,

    // Handlers
    handleTabChange,
    openModal,
    closeModal,
    handleModalOverlayClick,
    toggleDescriptorTooltip,
    handleQuestionTypeToggle,
    handleAssessmentTypeToggle,
    handleItemSearch,
    handleAssessmentSearch,
    handleAddHeaderImage,
    addAlternative,
    removeAlternative,
    handleAlternativeChange,
    handleSaveItem,
    handleViewItemDetails,
    handleDeleteItem,
    handleAddItemToAssessment,
    handleRemoveItemFromAssessment,
    handleClearAllItemsFromAssessment,
    handleShuffleQuestions,
    handleRestoreOriginalOrder,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePreview,
    handleGeneratePDF,
    generatePDF,
    generatePDFPreview,
    generateAssessmentPDF,
    handleAssessmentDataChange,
    handlePreviewDataChange,
    handleNewItemDataChange,
    handleAfirmativaChange,
    handleGabaritoAfirmativaChange,
    handleGabaritoAfirmativaExtraChange,
    addAfirmativa,
    removeAfirmativa,
    hasFormData,
    handleCancelNewItem,
    confirmCancel,
    handleInstructionsChange,
    handleSelectAssessmentForCorrection,
    handleCorrectionHeaderChange,
    handleToggleAnswer,
    handleClearAllAnswers,
    handleSaveCorrection,
    handleDeleteGrading,
    loadItems,
    loadAssessments,
    handleSearchMyItems,
  }
}