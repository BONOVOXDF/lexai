"""Popula o banco com dados demo para o usuário admin (idempotente)."""

import asyncio
import sys
from datetime import date, timedelta

sys.path.insert(0, ".")

from sqlalchemy import func, select

from app.database.base import Base
from app.database.session import engine, async_session_factory as async_session
from app.models.agenda import EventoAgenda, TipoEvento
from app.models.cliente import Cliente
from app.models.conversa import Conversa, Mensagem, TipoMensagem
from app.models.documento import Documento, TipoDocumento
from app.models.financeiro import CategoriaMovimento, MovimentoFinanceiro, TipoMovimento
from app.models.peticao import Peticao, TipoPeticao
from app.models.processo import Processo, StatusProcesso
from app.models.user import User

ADMIN_EMAIL = "admin@lexai.com"


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        user = result.scalar_one_or_none()
        if user is None:
            print(f"Usuário {ADMIN_EMAIL} não encontrado. Rode scripts/create_admin.py primeiro.")
            return
        print(f"Admin: {user.email} (id={user.id})")

        if await db.scalar(select(func.count()).select_from(Cliente).where(Cliente.user_id == user.id)) > 0:
            print("Usuário admin já possui clientes — seed ignorado (idempotente).")
            return

        hoje = date.today()

        # --- Clientes ---
        cliente_joao = Cliente(
            user_id=user.id,
            nome="João Carlos da Silva",
            cpf="412.556.789-00",
            telefone="(11) 99876-5432",
            email="joao.silva@email.com",
            endereco="Rua das Palmeiras, 120 - São Paulo/SP",
            tipo="pessoa_fisica",
            anotacoes="Cliente desde 2024. Prefere contato por WhatsApp.",
        )
        cliente_maria = Cliente(
            user_id=user.id,
            nome="Maria Aparecida Souza",
            cpf="287.334.110-88",
            telefone="(11) 98765-1234",
            email="maria.souza@email.com",
            endereco="Av. Paulista, 1500, ap 82 - São Paulo/SP",
            tipo="pessoa_fisica",
            anotacoes="Caso de direito do consumidor em andamento.",
        )
        cliente_tech = Cliente(
            user_id=user.id,
            nome="Tech Soluções LTDA",
            cnpj="12.345.678/0001-90",
            telefone="(11) 3456-7890",
            email="juridico@techsolucoes.com.br",
            endereco="Rua do Comércio, 900 - São Paulo/SP",
            tipo="pessoa_juridica",
            anotacoes="Contrato de prestação de serviços e locação.",
        )
        db.add_all([cliente_joao, cliente_maria, cliente_tech])
        await db.flush()

        # --- Processos ---
        proc_consumidor = Processo(
            user_id=user.id,
            cliente_id=cliente_maria.id,
            numero="1023456-78.2025.8.26.0100",
            tribunal="Tribunal de Justiça de São Paulo",
            classe="Procedimento Comum Cível",
            vara="Vara Cível",
            comarca="São Paulo",
            advogado="Advogado(a) responsável: Dr(a). Responsável LEX AI",
            status=StatusProcesso.EM_ANDAMENTO,
            prazo=hoje + timedelta(days=15),
            valor_causa=25000.0,
            observacoes="Revisão de contrato de financiamento bancário.",
        )
        proc_locacao = Processo(
            user_id=user.id,
            cliente_id=cliente_tech.id,
            numero="0001122-33.2025.8.26.0101",
            tribunal="Tribunal de Justiça de São Paulo",
            classe="Ação de Despejo",
            vara="Vara de Execuções de Aluguéis",
            comarca="São Paulo",
            advogado="Advogado(a) responsável: Dr(a). Responsável LEX AI",
            status=StatusProcesso.DISTRIBUIDO,
            prazo=hoje + timedelta(days=5),
            valor_causa=180000.0,
            observacoes="Inadimplemento de aluguéis comerciais.",
        )
        proc_ltrabalhista = Processo(
            user_id=user.id,
            cliente_id=cliente_joao.id,
            numero="0100233-44.2024.5.02.0000",
            tribunal="Tribunal Regional do Trabalho da 2ª Região",
            classe="Reclamação Trabalhista",
            vara="Vara do Trabalho",
            comarca="São Paulo",
            advogado="Advogado(a) responsável: Dr(a). Responsável LEX AI",
            status=StatusProcesso.CONCLUIDO,
            prazo=None,
            valor_causa=60000.0,
            observacoes="Acordo homologado.",
        )
        db.add_all([proc_consumidor, proc_locacao, proc_ltrabalhista])
        await db.flush()

        # --- Petições ---
        peticoes = [
            Peticao(
                user_id=user.id,
                titulo="Contrato de Prestação de Serviços — Tech Soluções",
                tipo=TipoPeticao.CONTRATO,
                processo_numero=proc_locacao.numero,
                tribunal=proc_locacao.tribunal,
                partes="Tech Soluções LTDA (contratante) / Cliente X (contratada)",
                conteudo=(
                    "CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n"
                    "CONTRATANTE: Tech Soluções LTDA, inscrita no CNPJ sob o nº 12.345.678/0001-90...\n\n"
                    "CLÁUSULA PRIMEIRA — DO OBJETO\n"
                    "O presente contrato tem por objeto a prestação de serviços de consultoria jurídica...\n\n"
                    "CLÁUSULA SEGUNDA — DA REMUNERAÇÃO\n"
                    "Pelos serviços prestados, o CONTRATANTE pagará o valor mensal de R$ 5.000,00...\n\n"
                    "CLÁUSULA TERCEIRA — DA VIGÊNCIA\n"
                    "O presente contrato vigorará pelo prazo de 12 (doze) meses..."
                ),
            ),
            Peticao(
                user_id=user.id,
                titulo="Petição Inicial — Ação de Despejo",
                tipo=TipoPeticao.INICIAL,
                processo_numero=proc_locacao.numero,
                tribunal=proc_locacao.tribunal,
                partes="Tech Soluções LTDA (autora)",
                conteudo=(
                    "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(ÍZA) DE DIREITO DA VARA DE "
                    "EXECUÇÕES DE ALUGUÉIS DA COMARCA DE SÃO PAULO\n\n"
                    "AÇÃO DE DESPEJO POR FALTA DE PAGAMENTO\n\n"
                    "A autora vem, respeitosamente, perante Vossa Excelência, com fulcro no art. 5º da "
                    "Lei nº 8.245/91, propor a presente AÇÃO DE DESPEJO POR FALTA DE PAGAMENTO..."
                ),
            ),
            Peticao(
                user_id=user.id,
                titulo="Contestação — Ação de Cobrança",
                tipo=TipoPeticao.CONTESTACAO,
                processo_numero="0009988-77.2025.8.26.0102",
                tribunal="Tribunal de Justiça de São Paulo",
                partes="Maria Aparecida Souza (contestante)",
                conteudo=(
                    "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(ÍZA) DE DIREITO\n\n"
                    "CONTESTAÇÃO\n\n"
                    "A contestante, já qualificada nos autos, vem, tempestivamente, apresentar "
                    "CONTESTAÇÃO à ação de cobrança proposta..., pelos fundamentos de fato e de direito "
                    "a seguir expostos..."
                ),
            ),
            Peticao(
                user_id=user.id,
                titulo="Procuração Ad Judicia et Extra",
                tipo=TipoPeticao.PROCURACAO,
                processo_numero=None,
                tribunal=None,
                partes="João Carlos da Silva (outorgante)",
                conteudo=(
                    "PROCURAÇÃO AD JUDICIA ET EXTRA\n\n"
                    "OUTORGANTE: João Carlos da Silva, brasileiro, portador do CPF nº 412.556.789-00...\n\n"
                    "OUTORGADO: Dr(a). Responsável LEX AI, OAB/SP 000.000...\n\n"
                    "Pelo presente instrumento particular de procuração, o OUTORGANTE nomeia e constitui "
                    "o OUTORGADO seu bastante procurador..."
                ),
            ),
            Peticao(
                user_id=user.id,
                titulo="Parecer Jurídico — Análise de Cláusula Contratual",
                tipo=TipoPeticao.PARECER,
                processo_numero=None,
                tribunal=None,
                partes="Tech Soluções LTDA (consulente)",
                conteudo=(
                    "PARECER JURÍDICO\n\n"
                    "CONSULENTE: Tech Soluções LTDA\n\n"
                    "I — RELATÓRIO\n"
                    "Trata-se de consulta acerca da legalidade da cláusula penal de 10% (dez por cento) "
                    "prevista no contrato de prestação de serviços...\n\n"
                    "II — FUNDAMENTAÇÃO\n"
                    "Conforme o art. 408 do Código Civil...\n\n"
                    "III — CONCLUSÃO\n"
                    "Ante o exposto, entende-se que a cláusula é legalmente válida..."
                ),
            ),
            Peticao(
                user_id=user.id,
                titulo="Contrato de Locação Comercial — Minuta",
                tipo=TipoPeticao.CONTRATO,
                processo_numero=None,
                tribunal=None,
                partes="Tech Soluções LTDA (locatária)",
                conteudo=(
                    "CONTRATO DE LOCAÇÃO COMERCIAL\n\n"
                    "LOCADOR: Nome do Locador, CPF/CNPJ nº ...\n"
                    "LOCATÁRIO: Tech Soluções LTDA, CNPJ nº 12.345.678/0001-90...\n\n"
                    "CLÁUSULA PRIMEIRA — DO IMÓVEL\n"
                    "O presente contrato tem por objeto a locação do imóvel situado à Rua do Comércio, 900..."
                ),
            ),
        ]
        db.add_all(peticoes)

        # --- Agenda ---
        agenda = [
            EventoAgenda(
                user_id=user.id,
                cliente_id=cliente_maria.id,
                processo_id=proc_consumidor.id,
                titulo="Audiência de Conciliação",
                tipo=TipoEvento.AUDIENCIA,
                descricao="Audiência virtual pelo aplicativo do TJSP.",
                data_inicio=hoje + timedelta(days=15),
                hora_inicio="14:30",
                local="Vídeo — TJSP",
                notificar=True,
                concluido=False,
            ),
            EventoAgenda(
                user_id=user.id,
                cliente_id=cliente_tech.id,
                processo_id=proc_locacao.id,
                titulo="Prazo para contestação",
                tipo=TipoEvento.PRAZO,
                descricao="Último dia útil para apresentar contestação.",
                data_inicio=hoje + timedelta(days=5),
                notificar=True,
                concluido=False,
            ),
            EventoAgenda(
                user_id=user.id,
                titulo="Reunião com cliente — Tech Soluções",
                tipo=TipoEvento.REUNIAO,
                descricao="Revisão trimestral de contratos e demandas.",
                data_inicio=hoje + timedelta(days=2),
                hora_inicio="10:00",
                local="Escritório",
                notificar=True,
                concluido=False,
            ),
            EventoAgenda(
                user_id=user.id,
                cliente_id=cliente_joao.id,
                titulo="Reunião de acompanhamento",
                tipo=TipoEvento.COMPROMISSO,
                descricao="Acompanhamento do processo trabalhista encerrado.",
                data_inicio=hoje - timedelta(days=1),
                hora_inicio="09:00",
                concluido=True,
                notificar=False,
            ),
        ]
        db.add_all(agenda)

        # --- Financeiro ---
        financeiro = [
            MovimentoFinanceiro(
                user_id=user.id,
                cliente_id=cliente_tech.id,
                tipo=TipoMovimento.RECEITA,
                categoria=CategoriaMovimento.MENSALIDADE,
                descricao="Mensalidade — consultoria jurídica",
                valor=5000.0,
                data=hoje.replace(day=5),
                status="pago",
            ),
            MovimentoFinanceiro(
                user_id=user.id,
                cliente_id=cliente_joao.id,
                tipo=TipoMovimento.RECEITA,
                categoria=CategoriaMovimento.HONORARIOS,
                descricao="Honorários — processo trabalhista",
                valor=12000.0,
                data=hoje.replace(day=1),
                status="pago",
                observacoes="Aguardando compensação.",
            ),
            MovimentoFinanceiro(
                user_id=user.id,
                tipo=TipoMovimento.DESPESA,
                categoria=CategoriaMovimento.CUSTAS,
                descricao="Custas processuais — TJSP",
                valor=2450.0,
                data=hoje.replace(day=3),
                status="pago",
            ),
            MovimentoFinanceiro(
                user_id=user.id,
                tipo=TipoMovimento.DESPESA,
                categoria=CategoriaMovimento.DESPESA_OPERACIONAL,
                descricao="Assinatura de sistema jurídico",
                valor=380.0,
                data=hoje.replace(day=10),
                status="pendente",
            ),
        ]
        db.add_all(financeiro)

        # --- Documentos ---
        documentos = [
            Documento(
                user_id=user.id,
                processo_id=proc_consumidor.id,
                cliente_id=cliente_maria.id,
                nome_original="contrato-financiamento.pdf",
                caminho_arquivo="uploads/demo/contrato-financiamento.pdf",
                tipo=TipoDocumento.PDF,
                tamanho_bytes=245000,
                mime_type="application/pdf",
                conteudo_texto="Contrato de financiamento bancário nº 4455, valor financiado R$ 25.000,00...",
                resumo="Contrato de financiamento com cláusula de capitalização de juros questionável.",
                status="pronto",
                is_indexed=True,
            ),
            Documento(
                user_id=user.id,
                processo_id=proc_locacao.id,
                cliente_id=cliente_tech.id,
                nome_original="contrato-locacao.pdf",
                caminho_arquivo="uploads/demo/contrato-locacao.pdf",
                tipo=TipoDocumento.PDF,
                tamanho_bytes=188000,
                mime_type="application/pdf",
                conteudo_texto="Contrato de locação de imóvel comercial, aluguel mensal R$ 15.000,00...",
                resumo="Contrato de locação comercial com garantia de fiança bancária.",
                status="pronto",
                is_indexed=True,
            ),
            Documento(
                user_id=user.id,
                cliente_id=cliente_joao.id,
                nome_original="proc-trabalhista.docx",
                caminho_arquivo="uploads/demo/proc-trabalhista.docx",
                tipo=TipoDocumento.DOCX,
                tamanho_bytes=56000,
                mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                conteudo_texto="Documentos da reclamação trabalhista 0100233-44.2024.5.02.0000...",
                resumo="Documentação da reclamação trabalhista já encerrada.",
                status="pronto",
                is_indexed=False,
            ),
        ]
        db.add_all(documentos)

        # --- Conversa do Assistente ---
        conversa = Conversa(
            user_id=user.id,
            titulo="Análise do contrato de locação",
            is_favorita=True,
        )
        db.add(conversa)
        await db.flush()
        mensagens = [
            Mensagem(
                conversa_id=conversa.id,
                tipo=TipoMensagem.USUARIO,
                conteudo="Analise o contrato de locação comercial e aponte riscos.",
            ),
            Mensagem(
                conversa_id=conversa.id,
                tipo=TipoMensagem.ASSISTENTE,
                conteudo=(
                    "Identifiquei os seguintes pontos de atenção no contrato de locação comercial:\n\n"
                    "1. A cláusula de reajuste utiliza o IGP-M sem limite de variação anual.\n"
                    "2. A multa rescisória de 3 aluguéis pode ser reduzida judicialmente.\n"
                    "3. Falta previsão de responsabilidade sobre benfeitorias úteis.\n\n"
                    "Recomendo revisar as cláusulas 4.2, 7.1 e 12.3 antes da assinatura."
                ),
                fontes='["contrato-locacao.pdf"]',
                precisa_revisao=False,
            ),
        ]
        db.add_all(mensagens)

        await db.commit()
        print("Seed concluído com sucesso!")
        print(f"  Clientes: 3 | Processos: 3 | Petições: 6 | Agenda: 4 | Financeiro: 4 | Documentos: 3 | Conversa: 1")


asyncio.run(seed())
