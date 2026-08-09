/** Tipos compartilhados do frontend LEX AI. */

export interface User {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  oab?: string | null;
  plano: string;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Cliente {
  id: number;
  user_id: number;
  nome: string;
  cpf?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  tipo: string;
  anotacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export type StatusProcesso =
  | "em_andamento"
  | "arquivado"
  | "suspenso"
  | "concluido"
  | "distribuido";

export interface Processo {
  id: number;
  user_id: number;
  cliente_id?: number | null;
  numero: string;
  tribunal?: string | null;
  classe?: string | null;
  vara?: string | null;
  comarca?: string | null;
  advogado?: string | null;
  status: StatusProcesso;
  prazo?: string | null;
  observacoes?: string | null;
  valor_causa?: number | null;
  cliente_nome?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrazoKanbanItem {
  id: number;
  numero: string;
  tribunal?: string | null;
  classe?: string | null;
  comarca?: string | null;
  status: StatusProcesso;
  prazo?: string | null;
  cliente_id?: number | null;
  cliente_nome?: string | null;
}

export type ColunasPrazos = Record<string, PrazoKanbanItem[]>;

export interface PortalProcesso {
  id: number;
  numero: string;
  tribunal?: string | null;
  classe?: string | null;
  vara?: string | null;
  comarca?: string | null;
  status: StatusProcesso;
  prazo?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export interface PortalEvento {
  id: number;
  titulo: string;
  tipo: string;
  descricao?: string | null;
  data_inicio: string;
  hora_inicio?: string | null;
  data_fim?: string | null;
  hora_fim?: string | null;
  local?: string | null;
  concluido: boolean;
  processo_id?: number | null;
}

export interface Intimacao {
  id: number;
  user_id: number;
  processo_id?: number | null;
  cliente_id?: number | null;
  cliente_nome?: string | null;
  numero_processo: string;
  tribunal?: string | null;
  orgao?: string | null;
  tipo: string;
  data_publicacao?: string | null;
  prazo?: string | null;
  descricao?: string | null;
  link?: string | null;
  created_at: string;
}

export type TipoDocumento = "pdf" | "docx" | "imagem" | "texto" | "pptx";

export interface Documento {
  id: number;
  user_id: number;
  processo_id?: number | null;
  cliente_id?: number | null;
  nome_original: string;
  tipo: TipoDocumento;
  tamanho_bytes: number;
  mime_type?: string | null;
  resumo?: string | null;
  status: string;
  is_indexed: boolean;
  created_at: string;
}

export type TipoMensagem = "usuario" | "assistente";

export interface Mensagem {
  id: number;
  conversa_id: number;
  tipo: TipoMensagem;
  conteudo: string;
  fontes?: string | null;
  precisa_revisao: boolean;
  created_at: string;
}

export interface Conversa {
  id: number;
  user_id: number;
  titulo: string;
  is_favorita: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversaDetail extends Conversa {
  mensagens: Mensagem[];
}

export interface MensagemAIResult {
  mensagem: Mensagem;
  conversa_id: number;
}

export type TipoPeticao =
  | "inicial"
  | "contestacao"
  | "agravo"
  | "apelacao"
  | "mandado_de_seguranca"
  | "contrato"
  | "procuracao"
  | "parecer"
  | "personalizado";

export interface Peticao {
  id: number;
  user_id: number;
  titulo: string;
  tipo: TipoPeticao;
  conteudo: string;
  processo_numero?: string | null;
  tribunal?: string | null;
  partes?: string | null;
  created_at: string;
  updated_at: string;
}

export type TipoEvento = "audiencia" | "compromisso" | "prazo" | "reuniao" | "outro";

export interface Evento {
  id: number;
  user_id: number;
  cliente_id?: number | null;
  processo_id?: number | null;
  titulo: string;
  tipo: TipoEvento;
  descricao?: string | null;
  data_inicio: string;
  hora_inicio?: string | null;
  data_fim?: string | null;
  hora_fim?: string | null;
  local?: string | null;
  notificar: boolean;
  concluido: boolean;
  created_at: string;
  updated_at: string;
}

export type TipoMovimento = "receita" | "despesa";

export type CategoriaMovimento =
  | "honorarios"
  | "mensalidade"
  | "reembolso"
  | "despesa_operacional"
  | "custas"
  | "impostos"
  | "outros";

export interface MovimentoFinanceiro {
  id: number;
  user_id: number;
  cliente_id?: number | null;
  tipo: TipoMovimento;
  categoria: CategoriaMovimento;
  descricao: string;
  valor: number;
  data: string;
  status: string;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumoFinanceiro {
  receitas_total: number;
  despesas_total: number;
  saldo: number;
  receitas_pendentes: number;
  despesas_pendentes: number;
}

export interface DashboardStats {
  total_clientes: number;
  total_processos: number;
  processos_andamento: number;
  processos_prazo_proximo: number;
  total_consultas_ia: number;
  total_peticoes: number;
  total_documentos: number;
  eventos_hoje: number;
  receitas_mes: number;
  despesas_mes: number;
}

export interface PontoGrafico {
  rotulo: string;
  valor: number;
}

export interface AtividadeRecente {
  id: number;
  tipo: string;
  descricao: string;
  data: string;
  entidade_id?: number | null;
}

export interface DashboardData {
  stats: DashboardStats;
  peticoes_recentes: Peticao[];
  processos_recentes: Processo[];
  clientes_recentes: Cliente[];
  conversas_recentes: Conversa[];
  eventos_proximos: Evento[];
  atividades_recentes: AtividadeRecente[];
  receitas_por_mes: PontoGrafico[];
  despesas_por_mes: PontoGrafico[];
}

export interface ResultadoPesquisa {
  titulo: string;
  tipo: string;
  orgao?: string | null;
  data?: string | null;
  resumo: string;
  url?: string | null;
  numero?: string | null;
  teor?: string | null;
}

export interface ResultadoPesquisaIA {
  resposta: string;
  fontes: {
    fonte: string;
    tipo: string;
    trecho: string;
    score: number;
    url?: string | null;
    data?: string | null;
  }[];
  precisa_revisao: boolean;
}

export interface Assinatura {
  plano_atual: string;
  status?: string | null;
  payment_id?: string | null;
  plano_expira_em?: string | null;
  data_aprovacao?: string | null;
  data_cancelamento?: string | null;
  precos?: Record<string, number> | null;
}

export interface AssinaturaCheckout {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  transaction_amount: number;
  status: string;
}
