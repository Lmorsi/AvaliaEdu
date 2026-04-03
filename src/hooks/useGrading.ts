import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Class, Student, AssessmentGrading, StudentResult, QuestionStatistic, Folder } from '../lib/supabase'

export const useGrading = (userId: string | undefined, savedAssessments?: any[]) => {
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [gradings, setGradings] = useState<AssessmentGrading[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [selectedClassForGrading, setSelectedClassForGrading] = useState<Class | null>(null)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [compiledReports, setCompiledReports] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'individual' | 'compiled'>('individual')
  const [selectedAssessmentName, setSelectedAssessmentName] = useState<string>('')
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showGradingModal, setShowGradingModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [selectedAssessmentForGrading, setSelectedAssessmentForGrading] = useState<any>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const [classData, setClassData] = useState({
    name: '',
    school_year: new Date().getFullYear().toString()
  })

  const [studentData, setStudentData] = useState({
    name: '',
    registration_number: ''
  })

  const [gradingData, setGradingData] = useState({
    assessmentName: '',
    totalQuestions: 0,
    answerKey: [] as string[],
    itemDescriptors: [] as string[],
    itemTypes: [] as string[],
    itemAlternatives: [] as string[][],
    itemGroups: [] as number[][],
    folderId: null as string | null
  })

  const [folderData, setFolderData] = useState({
    name: '',
    color: '#3B82F6',
    parentFolderId: null as string | null
  })

  const [studentAnswers, setStudentAnswers] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (userId) {
      loadClasses()
      loadGradings()
      loadFolders()
    }
  }, [userId])

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Erro ao carregar turmas:', error)
    }
  }

  const loadStudents = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('grading_students')
        .select('*')
        .eq('class_id', classId)
        .order('name', { ascending: true })

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Erro ao carregar estudantes:', error)
    }
  }

  const loadGradings = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_gradings')
        .select('*, classes(name)')
        .order('grading_date', { ascending: false })

      if (error) throw error
      setGradings(data || [])
    } catch (error) {
      console.error('Erro ao carregar correções:', error)
    }
  }

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFolders(data || [])
    } catch (error) {
      console.error('Erro ao carregar pastas:', error)
    }
  }

  const handleCreateFolder = async () => {
    if (!folderData.name || !userId) {
      alert('Por favor, preencha o nome da pasta')
      return
    }

    try {
      const { error } = await supabase
        .from('folders')
        .insert([
          {
            user_id: userId,
            name: folderData.name,
            color: folderData.color,
            parent_folder_id: folderData.parentFolderId
          }
        ])

      if (error) throw error

      alert('Pasta criada com sucesso!')
      setFolderData({ name: '', color: '#3B82F6', parentFolderId: null })
      await loadFolders()
      setShowFolderModal(false)
    } catch (error) {
      console.error('Erro ao criar pasta:', error)
      alert('Erro ao criar pasta')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pasta? As correções dentro dela não serão excluídas.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)

      if (error) throw error

      await loadFolders()
      alert('Pasta excluída com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir pasta:', error)
      alert('Erro ao excluir pasta')
    }
  }

  const handleMoveGradingToFolder = async (gradingId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('assessment_gradings')
        .update({ folder_id: folderId })
        .eq('id', gradingId)

      if (error) throw error

      await loadGradings()
    } catch (error) {
      console.error('Erro ao mover correção:', error)
      alert('Erro ao mover correção')
    }
  }

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const handleCreateClass = async () => {
    if (!classData.name || !userId) {
      alert('Por favor, preencha o nome da turma')
      return
    }

    try {
      const { error } = await supabase
        .from('classes')
        .insert([
          {
            user_id: userId,
            name: classData.name,
            school_year: classData.school_year
          }
        ])

      if (error) throw error

      alert('Turma criada com sucesso!')
      setClassData({ name: '', school_year: new Date().getFullYear().toString() })
      await loadClasses()
    } catch (error) {
      console.error('Erro ao criar turma:', error)
      alert('Erro ao criar turma')
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta turma? Todos os estudantes e correções relacionadas serão perdidos.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)

      if (error) throw error

      await loadClasses()
      alert('Turma excluída com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir turma:', error)
      alert('Erro ao excluir turma')
    }
  }

  const handleViewStudents = async (classId: string) => {
    const classItem = classes.find(c => c.id === classId)
    if (!classItem) return

    setSelectedClass(classItem)
    await loadStudents(classId)
    setShowStudentsModal(true)
  }

  const handleAddStudent = async () => {
    if (!studentData.name || !selectedClass) return

    try {
      const { data, error } = await supabase
        .from('grading_students')
        .insert([
          {
            class_id: selectedClass.id,
            name: studentData.name,
            registration_number: studentData.registration_number
          }
        ])
        .select()

      if (error) throw error

      setStudentData({ name: '', registration_number: '' })
      await loadStudents(selectedClass.id)
      alert('Estudante adicionado com sucesso!')
    } catch (error) {
      console.error('Erro ao adicionar estudante:', error)
      alert('Erro ao adicionar estudante')
    }
  }

  const handleAddStudentBulk = async (student: { name: string; registration_number?: string }) => {
    if (!student.name || !selectedClass) return

    try {
      const { error } = await supabase
        .from('grading_students')
        .insert([
          {
            class_id: selectedClass.id,
            name: student.name,
            registration_number: student.registration_number || ''
          }
        ])

      if (error) throw error

      await loadStudents(selectedClass.id)
    } catch (error) {
      console.error('Erro ao adicionar estudante em massa:', error)
      throw error
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este estudante?')) return

    try {
      const { error } = await supabase
        .from('grading_students')
        .delete()
        .eq('id', studentId)

      if (error) throw error

      if (selectedClass) {
        await loadStudents(selectedClass.id)
      }
      alert('Estudante excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir estudante:', error)
      alert('Erro ao excluir estudante')
    }
  }

  const handleSelectClassForGrading = async (classItem: Class) => {
    setSelectedClassForGrading(classItem)
    await loadStudents(classItem.id)
  }

  const handleSelectAssessmentForGrading = (assessmentId: string) => {
    if (!assessmentId || !savedAssessments) {
      setSelectedAssessmentForGrading(null)
      setGradingData({
        assessmentName: '',
        totalQuestions: 0,
        answerKey: [],
        itemDescriptors: [],
        itemTypes: [],
        itemAlternatives: [],
        itemGroups: []
      })
      return
    }

    const assessment = savedAssessments.find((a: any) => a.id.toString() === assessmentId)
    if (!assessment) return

    setSelectedAssessmentForGrading(assessment)

    const answerKey: string[] = []
    const itemDescriptors: string[] = []
    const itemTypes: string[] = []
    const itemAlternatives: string[][] = []
    const itemGroups: number[][] = []
    let answerIndex = 0

    const selectedItems = assessment.selectedItems || assessment.selected_items || []
    let totalItems = 0

    selectedItems.forEach((item: any) => {
      const tipoItem = item.tipoItem || item.tipo_item
      const descritor = item.descritor || ''

      if (tipoItem === 'multipla_escolha') {
        const respostaCorreta = item.respostaCorreta || item.resposta_correta || ''
        const alternativas = item.alternativas || []
        const opcoes = alternativas
          .filter((alt: string) => alt && alt.trim())
          .map((_: string, idx: number) => String.fromCharCode(65 + idx))

        answerKey.push(respostaCorreta)
        itemDescriptors.push(descritor)
        itemTypes.push('multipla_escolha')
        itemAlternatives.push(opcoes)
        itemGroups.push([answerIndex])
        answerIndex++
        totalItems++
      } else if (tipoItem === 'verdadeiro_falso') {
        const afirmativas = [
          ...(item.afirmativas || []),
          ...(item.afirmativas_extras || item.afirmativasExtras || [])
        ].filter((a: string) => a && a.trim())

        const gabaritos = [
          ...(item.gabarito_afirmativas || item.gabaritoAfirmativas || []),
          ...(item.gabarito_afirmativas_extras || item.gabaritoAfirmativasExtras || [])
        ].filter((g: string, idx: number) => {
          const afirmativa = afirmativas[idx]
          return afirmativa && afirmativa.trim()
        })

        const groupIndices: number[] = []
        gabaritos.forEach((gabarito: string) => {
          answerKey.push(gabarito)
          itemDescriptors.push(descritor)
          itemTypes.push('verdadeiro_falso')
          itemAlternatives.push(['V', 'F'])
          groupIndices.push(answerIndex)
          answerIndex++
        })
        itemGroups.push(groupIndices)
        totalItems++
      }
    })

    const nomeAvaliacao = assessment.nomeAvaliacao || assessment.nome_avaliacao ||
                          assessment.tipoAvaliacao || assessment.tipo_avaliacao || 'Avaliação'

    setGradingData({
      assessmentName: nomeAvaliacao,
      totalQuestions: totalItems,
      answerKey: answerKey,
      itemDescriptors: itemDescriptors,
      itemTypes: itemTypes,
      itemAlternatives: itemAlternatives,
      itemGroups: itemGroups
    })
  }

  const handleClearClassSelection = () => {
    setSelectedClassForGrading(null)
    setSelectedAssessmentForGrading(null)
    setGradingData({
      assessmentName: '',
      totalQuestions: 0,
      answerKey: [],
      itemDescriptors: [],
      itemTypes: [],
      itemAlternatives: [],
      itemGroups: []
    })
    setStudentAnswers({})
  }

  const handleTotalQuestionsChange = (total: number) => {
    setGradingData(prev => ({
      ...prev,
      totalQuestions: total,
      answerKey: Array(total).fill(''),
      itemDescriptors: Array(total).fill('')
    }))
  }

  const handleAnswerKeyChange = (index: number, value: string) => {
    setGradingData(prev => {
      const newAnswerKey = [...prev.answerKey]
      newAnswerKey[index] = value
      return { ...prev, answerKey: newAnswerKey }
    })
  }

  const handleStartGrading = async () => {
    if (!selectedClassForGrading) return

    await loadStudents(selectedClassForGrading.id)

    const initialAnswers: Record<string, string[]> = {}
    students.forEach(student => {
      initialAnswers[student.id] = Array(gradingData.totalQuestions).fill('')
    })
    setStudentAnswers(initialAnswers)
    setShowGradingModal(true)
  }

  const handleStudentAnswerChange = (studentId: string, questionIndex: number, value: string) => {
    setStudentAnswers(prev => {
      const studentAnswersCopy = [...(prev[studentId] || [])]
      studentAnswersCopy[questionIndex] = value
      return { ...prev, [studentId]: studentAnswersCopy }
    })
  }

  const calculateStatistics = (answers: Record<string, string[]>, answerKey: string[]) => {
    const questionStats: any[] = []

    for (let i = 0; i < answerKey.length; i++) {
      const stat = {
        question_number: i + 1,
        correct_answer: answerKey[i],
        option_a_count: 0,
        option_b_count: 0,
        option_c_count: 0,
        option_d_count: 0,
        option_e_count: 0,
        blank_count: 0,
        total_correct: 0,
        total_incorrect: 0
      }

      Object.values(answers).forEach(studentAnswers => {
        const answer = studentAnswers[i] || ''

        if (!answer) {
          stat.blank_count++
        } else {
          switch (answer.toUpperCase()) {
            case 'A': stat.option_a_count++; break
            case 'B': stat.option_b_count++; break
            case 'C': stat.option_c_count++; break
            case 'D': stat.option_d_count++; break
            case 'E': stat.option_e_count++; break
          }

          if (answer.toUpperCase() === answerKey[i].toUpperCase()) {
            stat.total_correct++
          } else {
            stat.total_incorrect++
          }
        }
      })

      questionStats.push(stat)
    }

    return questionStats
  }

  const calculateStudentScore = (answers: string[], answerKey: string[], itemTypes: string[], selectedItems?: any[]) => {
    if (!selectedItems || selectedItems.length === 0) {
      let correctCount = 0
      answers.forEach((answer, index) => {
        if (answer && answer.toUpperCase() === answerKey[index].toUpperCase()) {
          correctCount++
        }
      })
      return {
        score: answerKey.length > 0 ? (correctCount / answerKey.length) * 100 : 0,
        correctCount: correctCount,
        incorrectCount: answerKey.length - correctCount
      }
    }

    let totalScore = 0
    let answerIndex = 0
    let totalCorrectItems = 0
    let totalIncorrectItems = 0

    selectedItems.forEach((item: any) => {
      const tipoItem = item.tipoItem || item.tipo_item
      const itemWeightPercent = 100 / selectedItems.length

      if (tipoItem === 'multipla_escolha') {
        const studentAnswer = answers[answerIndex] || ''
        const correctAnswer = answerKey[answerIndex] || ''

        if (studentAnswer && studentAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
          totalScore += itemWeightPercent
          totalCorrectItems++
        } else if (studentAnswer) {
          totalIncorrectItems++
        }
        answerIndex++
      } else if (tipoItem === 'verdadeiro_falso') {
        const afirmativas = [
          ...(item.afirmativas || []),
          ...(item.afirmativas_extras || item.afirmativasExtras || [])
        ].filter((a: string) => a && a.trim())

        const numAfirmativas = afirmativas.length
        const afirmativaWeight = itemWeightPercent / numAfirmativas
        let allCorrect = true
        let hasAnswer = false

        for (let i = 0; i < numAfirmativas; i++) {
          const studentAnswer = answers[answerIndex] || ''
          const correctAnswer = answerKey[answerIndex] || ''

          if (studentAnswer) {
            hasAnswer = true
            if (studentAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
              totalScore += afirmativaWeight
            } else {
              allCorrect = false
            }
          } else {
            allCorrect = false
          }
          answerIndex++
        }

        if (hasAnswer) {
          if (allCorrect) {
            totalCorrectItems++
          } else {
            totalIncorrectItems++
          }
        }
      }
    })

    return {
      score: totalScore,
      correctCount: totalCorrectItems,
      incorrectCount: totalIncorrectItems
    }
  }

  const handleSaveGrading = async () => {
    if (!selectedClassForGrading || !userId) return

    try {
      const { data: gradingRecord, error: gradingError } = await supabase
        .from('assessment_gradings')
        .insert([
          {
            user_id: userId,
            class_id: selectedClassForGrading.id,
            folder_id: gradingData.folderId,
            assessment_name: gradingData.assessmentName,
            total_questions: gradingData.totalQuestions,
            answer_key: gradingData.answerKey,
            item_descriptors: gradingData.itemDescriptors,
            item_types: gradingData.itemTypes,
            item_groups: gradingData.itemGroups,
            item_alternatives: gradingData.itemAlternatives
          }
        ])
        .select()
        .single()

      if (gradingError) throw gradingError

      const studentResults: any[] = []
      const absentStudents: Set<string> = new Set()

      for (const student of students) {
        const answers = studentAnswers[student.id] || []

        // Detectar se o aluno é faltoso (todas as respostas em branco)
        const isAbsent = answers.length === 0 || answers.every((answer: string) => !answer || answer.trim() === '')

        if (isAbsent) {
          absentStudents.add(student.id)
        }

        const selectedItems = selectedAssessmentForGrading?.selectedItems ||
                             selectedAssessmentForGrading?.selected_items || []

        const { score, correctCount, incorrectCount } = calculateStudentScore(
          answers,
          gradingData.answerKey,
          gradingData.itemTypes,
          selectedItems
        )

        studentResults.push({
          grading_id: gradingRecord.id,
          student_id: student.id,
          answers: answers,
          score: isAbsent ? 0 : score,
          correct_count: isAbsent ? 0 : correctCount,
          incorrect_count: isAbsent ? 0 : incorrectCount
        })
      }

      const { error: resultsError } = await supabase
        .from('student_results')
        .insert(studentResults)

      if (resultsError) throw resultsError

      // Filtrar respostas excluindo alunos faltosos para cálculo de estatísticas
      const studentAnswersForStats: Record<string, string[]> = {}
      Object.keys(studentAnswers).forEach(studentId => {
        if (!absentStudents.has(studentId)) {
          studentAnswersForStats[studentId] = studentAnswers[studentId]
        }
      })

      const questionStats = calculateStatistics(studentAnswersForStats, gradingData.answerKey)
      const questionStatsWithGradingId = questionStats.map(stat => ({
        ...stat,
        grading_id: gradingRecord.id
      }))

      const { error: statsError } = await supabase
        .from('question_statistics')
        .insert(questionStatsWithGradingId)

      if (statsError) throw statsError

      await loadGradings()
      setShowGradingModal(false)
      handleClearClassSelection()
      alert('Correção salva com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar correção:', error)
      alert('Erro ao salvar correção')
    }
  }

  const handleViewReport = async (gradingId: string) => {
    try {
      const { data: grading, error: gradingError } = await supabase
        .from('assessment_gradings')
        .select('*, classes(name)')
        .eq('id', gradingId)
        .single()

      if (gradingError) throw gradingError

      const { data: results, error: resultsError } = await supabase
        .from('student_results')
        .select('*, grading_students(name)')
        .eq('grading_id', gradingId)

      if (resultsError) throw resultsError

      const { data: questionStats, error: statsError } = await supabase
        .from('question_statistics')
        .select('*')
        .eq('grading_id', gradingId)
        .order('question_number', { ascending: true })

      if (statsError) throw statsError

      const studentResults = results.map((r: any) => {
        // Detectar se o aluno é faltoso (todas as respostas em branco)
        const answers = r.answers || []
        const isAbsent = answers.length === 0 || answers.every((answer: string) => !answer || answer.trim() === '')

        return {
          ...r,
          student_name: r.grading_students.name,
          absent: isAbsent
        }
      })

      // Filtrar alunos não faltosos para cálculo de média
      const presentStudents = studentResults.filter((r: any) => !r.absent)
      const totalStudents = studentResults.length
      const averageScore = presentStudents.length > 0
        ? presentStudents.reduce((sum: number, r: any) => sum + r.score, 0) / presentStudents.length
        : 0
      const studentsBelow30 = presentStudents.filter((r: any) => r.score < 30).length
      const lowPerformers = presentStudents
        .filter((r: any) => r.score < 30)
        .map((r: any) => ({
          id: r.id,
          name: r.student_name,
          score: r.score,
          correct_count: r.correct_count
        }))

      setSelectedReport({
        ...grading,
        class_name: grading.classes?.name || 'Sem turma',
        student_results: studentResults,
        question_stats: questionStats,
        total_students: totalStudents,
        average_score: averageScore,
        students_below_30: studentsBelow30,
        low_performers: lowPerformers,
        item_descriptors: grading.item_descriptors || [],
        item_types: grading.item_types || [],
        item_groups: grading.item_groups || [],
        item_alternatives: grading.item_alternatives || []
      })
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
      alert('Erro ao carregar relatório')
    }
  }

  const getUniqueAssessments = () => {
    const assessmentMap = new Map<string, any>()

    gradings.forEach((grading: any) => {
      const key = grading.assessment_name
      if (!assessmentMap.has(key)) {
        assessmentMap.set(key, {
          assessment_name: grading.assessment_name,
          item_descriptors: grading.item_descriptors || [],
          count: 1
        })
      } else {
        const existing = assessmentMap.get(key)
        assessmentMap.set(key, { ...existing, count: existing.count + 1 })
      }
    })

    return Array.from(assessmentMap.values()).filter(a => a.count > 1)
  }

  const handleCompileReports = async (assessmentName: string) => {
    try {
      setSelectedAssessmentName(assessmentName)

      const { data: matchingGradings, error: gradingsError } = await supabase
        .from('assessment_gradings')
        .select('*, classes(name)')
        .eq('assessment_name', assessmentName)

      if (gradingsError) throw gradingsError

      if (!matchingGradings || matchingGradings.length === 0) {
        alert('Nenhuma correção encontrada para esta avaliação')
        return
      }

      const compiled: any[] = []

      for (const grading of matchingGradings) {
        const { data: results, error: resultsError } = await supabase
          .from('student_results')
          .select('*, grading_students(name)')
          .eq('grading_id', grading.id)

        if (resultsError) throw resultsError

        const { data: questionStats, error: statsError } = await supabase
          .from('question_statistics')
          .select('*')
          .eq('grading_id', grading.id)
          .order('question_number', { ascending: true })

        if (statsError) throw statsError

        const studentResults = results.map((r: any) => {
          // Detectar se o aluno é faltoso (todas as respostas em branco)
          const answers = r.answers || []
          const isAbsent = answers.length === 0 || answers.every((answer: string) => !answer || answer.trim() === '')

          return {
            ...r,
            student_name: r.grading_students.name,
            absent: isAbsent
          }
        })

        // Filtrar alunos não faltosos para cálculo de média
        const presentStudents = studentResults.filter((r: any) => !r.absent)
        const totalStudents = studentResults.length
        const averageScore = presentStudents.length > 0
          ? presentStudents.reduce((sum: number, r: any) => sum + r.score, 0) / presentStudents.length
          : 0

        compiled.push({
          ...grading,
          class_name: grading.classes?.name || 'Sem turma',
          student_results: studentResults,
          question_stats: questionStats,
          total_students: totalStudents,
          average_score: averageScore,
          item_descriptors: grading.item_descriptors || [],
          item_types: grading.item_types || [],
          item_groups: grading.item_groups || [],
          item_alternatives: grading.item_alternatives || []
        })
      }

      setCompiledReports(compiled)
      setViewMode('compiled')
    } catch (error) {
      console.error('Erro ao compilar relatórios:', error)
      alert('Erro ao compilar relatórios')
    }
  }

  const handleDeleteGrading = async (gradingId: string) => {
    try {
      const { error } = await supabase
        .from('assessment_gradings')
        .delete()
        .eq('id', gradingId)

      if (error) throw error

      await loadGradings()
      return true
    } catch (error) {
      console.error('Erro ao excluir correção:', error)
      alert('Erro ao excluir correção')
      return false
    }
  }

  const handleExportReport = () => {
    if (!selectedReport) return

    let csvContent = 'data:text/csv;charset=utf-8,'

    csvContent += 'RELATÓRIO DE AVALIAÇÃO\n'
    csvContent += `Avaliação: ${selectedReport.assessment_name}\n`
    csvContent += `Turma: ${selectedReport.class_name}\n`
    csvContent += `Data: ${new Date(selectedReport.grading_date).toLocaleDateString('pt-BR')}\n`
    csvContent += `Total de Questões: ${selectedReport.total_questions}\n`
    csvContent += `\n`

    csvContent += 'RESULTADOS INDIVIDUAIS\n'
    csvContent += 'Estudante,Acertos,Erros,Percentual\n'
    selectedReport.student_results.forEach((result: any) => {
      csvContent += `${result.student_name},${result.correct_count},${result.incorrect_count},${result.score.toFixed(1)}%\n`
    })

    csvContent += '\n'
    csvContent += 'ESTATÍSTICAS POR QUESTÃO\n'
    csvContent += 'Questão,Gabarito,A,B,C,D,E,Branco,Acertos,Erros\n'
    selectedReport.question_stats.forEach((stat: any) => {
      csvContent += `${stat.question_number},${stat.correct_answer},${stat.option_a_count},${stat.option_b_count},${stat.option_c_count},${stat.option_d_count},${stat.option_e_count},${stat.blank_count},${stat.total_correct},${stat.total_incorrect}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_${selectedReport.assessment_name.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    classes,
    students,
    gradings,
    folders,
    selectedClass,
    selectedClassForGrading,
    selectedAssessmentForGrading,
    selectedReport,
    selectedFolder,
    compiledReports,
    viewMode,
    selectedAssessmentName,
    classData,
    studentData,
    gradingData,
    folderData,
    studentAnswers,
    showStudentsModal,
    showGradingModal,
    showFolderModal,
    expandedFolders,
    setClassData,
    setStudentData,
    setGradingData,
    setFolderData,
    setShowStudentsModal,
    setShowGradingModal,
    setShowFolderModal,
    setViewMode,
    setSelectedReport,
    setSelectedFolder,
    loadGradings,
    handleCreateClass,
    handleDeleteClass,
    handleViewStudents,
    handleAddStudent,
    handleAddStudentBulk,
    handleDeleteStudent,
    handleSelectClassForGrading,
    handleSelectAssessmentForGrading,
    handleClearClassSelection,
    handleTotalQuestionsChange,
    handleAnswerKeyChange,
    handleStartGrading,
    handleStudentAnswerChange,
    handleSaveGrading,
    handleViewReport,
    handleDeleteGrading,
    handleExportReport,
    getUniqueAssessments,
    handleCompileReports,
    handleCreateFolder,
    handleDeleteFolder,
    handleMoveGradingToFolder,
    toggleFolderExpansion
  }
}
