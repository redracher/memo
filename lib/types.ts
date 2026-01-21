export interface Note {
  id: string
  user_id: string
  title: string
  subtitle?: string
  content: any // JSON content from Novel editor
  created_at: string
  updated_at: string
  section_id?: string
}
