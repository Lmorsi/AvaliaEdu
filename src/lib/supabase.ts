import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam as credenciais do Supabase. Verifique o arquivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Class {
  id: string
  user_id: string
  name: string
  school_year: string
  created_at: string
}

export interface Student {
  id: string
  class_id: string
  name: string
  registration_number: string
  created_at: string
}

export interface Folder {
  id: string
  user_id: string
  name: string
  parent_folder_id: string | null
  color: string
  created_at: string
}

export interface AssessmentGrading {
  id: string
  user_id: string
  class_id: string
  folder_id: string | null
  assessment_name: string
  total_questions: number
  answer_key: string[]
  grading_date: string
  created_at: string
}

export interface StudentResult {
  id: string
  grading_id: string
  student_id: string
  answers: string[]
  score: number
  correct_count: number
  incorrect_count: number
  created_at: string
}

export interface QuestionStatistic {
  id: string
  grading_id: string
  question_number: number
  correct_answer: string
  option_a_count: number
  option_b_count: number
  option_c_count: number
  option_d_count: number
  option_e_count: number
  blank_count: number
  total_correct: number
  total_incorrect: number
  created_at: string
}

export interface Item {
  id: string
  user_id: string
  autor: string
  disciplina: string
  etapa_ensino: string
  tipo_item: string
  descritor: string
  texto_item: string
  justificativas: string
  alternativas: string[]
  resposta_correta: string
  justificativa: string
  nivel: string
  quantidade_linhas: string
  afirmativas: string[]
  afirmativas_extras: string[]
  gabarito_afirmativas: string[]
  gabarito_afirmativas_extras: string[]
  data_criacao: string
  created_at: string
}

export interface Assessment {
  id: string
  user_id: string
  nome_avaliacao: string
  professor: string
  turma: string
  data: string
  instrucoes: string
  header_image_url: string
  use_image_as_header: boolean
  image_width: number
  image_height: number
  header_image_width: number
  header_image_height: number
  tipo_avaliacao: string
  mostrar_tipo_avaliacao: boolean
  nome_escola: string
  componente_curricular: string
  colunas: string
  layout_paginas: string
  selected_items: any[]
  data_criacao: string
  created_at: string
}
