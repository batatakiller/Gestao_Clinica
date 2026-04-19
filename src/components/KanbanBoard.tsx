"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Clock, Stethoscope, Shield, AlertTriangle, Sparkles, GripVertical } from "lucide-react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

/* ───────── Types ───────── */

type Consulta = {
  id: string;
  paciente_id: string;
  medico_id: string;
  status: string;
  data_hora: string;
  duracao_min: number;
  tipo: string;
  motivo: string | null;
  observacoes: string | null;
  pacientes: {
    nome: string;
    telefone: string;
    plano_saude: string | null;
  } | null;
  medicos: {
    nome: string;
    crm: string;
  } | null;
};

interface ColumnDef {
  id: string;
  label: string;
  emoji: string;
  sub: string;
  headerBg: string;
  headerText: string;
  colBg: string;
  colBorder: string;
  cardAccent: string;
  isException?: boolean;
}

/* ───────── Column Definitions ───────── */

const COLUMNS: ColumnDef[] = [
  {
    id: "agendado", label: "Agendado", emoji: "📋", sub: "Criado pela IA",
    headerBg: "bg-blue-600", headerText: "text-white",
    colBg: "bg-blue-50/40", colBorder: "border-blue-200/60",
    cardAccent: "border-l-blue-500",
  },
  {
    id: "aguardando_confirmacao", label: "Aguard. Confirmação", emoji: "⏳", sub: "Sem confirmação",
    headerBg: "bg-amber-500", headerText: "text-white",
    colBg: "bg-amber-50/40", colBorder: "border-amber-200/60",
    cardAccent: "border-l-amber-500",
  },
  {
    id: "confirmado", label: "Confirmado", emoji: "✓", sub: "Paciente confirmou",
    headerBg: "bg-emerald-600", headerText: "text-white",
    colBg: "bg-emerald-50/40", colBorder: "border-emerald-200/60",
    cardAccent: "border-l-emerald-500",
  },
  {
    id: "hoje", label: "Hoje", emoji: "📅", sub: "Consultas do dia",
    headerBg: "bg-orange-500", headerText: "text-white",
    colBg: "bg-orange-50/40", colBorder: "border-orange-200/60",
    cardAccent: "border-l-orange-500",
  },
  {
    id: "em_atendimento", label: "Em Atendimento", emoji: "🩺", sub: "Em consulta",
    headerBg: "bg-cyan-600", headerText: "text-white",
    colBg: "bg-cyan-50/40", colBorder: "border-cyan-200/60",
    cardAccent: "border-l-cyan-500",
  },
  {
    id: "concluido", label: "Concluído", emoji: "✅", sub: "Finalizado",
    headerBg: "bg-green-600", headerText: "text-white",
    colBg: "bg-green-50/40", colBorder: "border-green-200/60",
    cardAccent: "border-l-green-500",
  },
  {
    id: "pos_atendimento", label: "Pós-Atend.", emoji: "💰", sub: "Follow-up",
    headerBg: "bg-rose-600", headerText: "text-white",
    colBg: "bg-rose-50/40", colBorder: "border-rose-200/60",
    cardAccent: "border-l-rose-500",
  },
  {
    id: "aguardando_retorno", label: "Aguard. Retorno", emoji: "🔁", sub: "Retorno futuro",
    headerBg: "bg-sky-600", headerText: "text-white",
    colBg: "bg-sky-50/40", colBorder: "border-sky-200/60",
    cardAccent: "border-l-sky-500",
  },
  // ── Exception columns ──
  {
    id: "faltou", label: "Faltou", emoji: "❌", sub: "Não compareceu",
    headerBg: "bg-red-600", headerText: "text-white",
    colBg: "bg-red-50/30", colBorder: "border-red-200/50",
    cardAccent: "border-l-red-500", isException: true,
  },
  {
    id: "cancelado", label: "Cancelado", emoji: "⛔", sub: "Cancelamento",
    headerBg: "bg-slate-600", headerText: "text-white",
    colBg: "bg-slate-50/40", colBorder: "border-slate-300/50",
    cardAccent: "border-l-slate-500", isException: true,
  },
  {
    id: "remarcacao", label: "Remarcação", emoji: "📌", sub: "Pendente",
    headerBg: "bg-stone-500", headerText: "text-white",
    colBg: "bg-stone-50/40", colBorder: "border-stone-200/50",
    cardAccent: "border-l-stone-500", isException: true,
  },
];

/* ───────── Status Mappings ───────── */

const COL_TO_STATUS: Record<string, string> = {
  agendado: "agendada",
  aguardando_confirmacao: "agendada",
  confirmado: "confirmada",
  hoje: "confirmada",
  em_atendimento: "em_atendimento",
  concluido: "concluida",
  pos_atendimento: "pos_atendimento",
  aguardando_retorno: "aguardando_retorno",
  faltou: "faltou",
  cancelado: "cancelada",
  remarcacao: "remarcacao_pendente",
};

const TRANSITIONS: Record<string, string[]> = {
  agendado: ["confirmado", "cancelado"],
  aguardando_confirmacao: ["confirmado", "faltou", "cancelado"],
  confirmado: ["em_atendimento", "faltou", "cancelado"],
  hoje: ["em_atendimento", "faltou"],
  em_atendimento: ["concluido"],
  concluido: ["pos_atendimento", "aguardando_retorno"],
  pos_atendimento: ["aguardando_retorno"],
  aguardando_retorno: ["agendado"],
  faltou: ["remarcacao"],
  cancelado: ["remarcacao"],
  remarcacao: ["agendado"],
};

/* ───────── Helpers ───────── */

function assignColumn(c: Consulta): string {
  const now = new Date();
  const cDate = new Date(c.data_hora);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  switch (c.status) {
    case "agendada":
      if (cDate >= todayStart && cDate <= in48h) return "aguardando_confirmacao";
      return "agendado";
    case "confirmada":
      if (cDate >= todayStart && cDate < tomorrowStart) return "hoje";
      return "confirmado";
    case "em_atendimento": return "em_atendimento";
    case "concluida": return "concluido";
    case "pos_atendimento": return "pos_atendimento";
    case "aguardando_retorno": return "aguardando_retorno";
    case "faltou": return "faltou";
    case "cancelada": return "cancelado";
    case "remarcacao_pendente": return "remarcacao";
    default: return "agendado";
  }
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function doctorShort(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return `Dr(a). ${parts[0]}`;
}

function formatDateTime(dateStr: string, columnId: string): string {
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (columnId === "hoje" || columnId === "em_atendimento") return time;
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${date} · ${time}`;
}

type Tag = { label: string; icon: React.ReactNode; bg: string; text: string };

function computeTags(c: Consulta, all: Consulta[]): Tag[] {
  const tags: Tag[] = [];

  if (c.motivo === "retorno") {
    tags.push({ label: "Retorno", icon: <RotateCcw className="h-3 w-3" />, bg: "bg-amber-100", text: "text-amber-700" });
  }

  const patientCount = all.filter(x => x.paciente_id === c.paciente_id).length;
  if (patientCount <= 1) {
    tags.push({ label: "Novo", icon: <Sparkles className="h-3 w-3" />, bg: "bg-blue-100", text: "text-blue-700" });
  }

  if (c.status === "agendada") {
    const hoursUntil = (new Date(c.data_hora).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil > 0 && hoursUntil <= 24) {
      tags.push({ label: "Risco", icon: <AlertTriangle className="h-3 w-3" />, bg: "bg-red-100", text: "text-red-700" });
    }
  }

  return tags;
}

/* ───────── Inner Card UI ───────── */

function CardBody({
  consulta,
  columnId,
  cardAccent,
  allConsultas,
  isOverlay = false,
  onMove,
  onMarkRetorno,
}: {
  consulta: Consulta;
  columnId: string;
  cardAccent: string;
  allConsultas: Consulta[];
  isOverlay?: boolean;
  onMove?: (id: string, targetCol: string) => void;
  onMarkRetorno?: (id: string) => void;
}) {
  const nome = shortName(consulta.pacientes?.nome || "Paciente");
  const dateDisplay = formatDateTime(consulta.data_hora, columnId);
  const medico = consulta.medicos ? doctorShort(consulta.medicos.nome) : null;
  const plano = consulta.pacientes?.plano_saude || null;
  const isRetorno = consulta.motivo === "retorno";
  const tags = computeTags(consulta, allConsultas);
  const targets = (TRANSITIONS[columnId] || []).map(tid => COLUMNS.find(c => c.id === tid)!).filter(Boolean);

  return (
    <div
      className={`group relative bg-white rounded-lg border border-slate-200/80 shadow-sm ${
        isOverlay ? "shadow-xl border-emerald-400 rotate-2" : "hover:shadow-md"
      } transition-all cursor-default border-l-[4px] ${cardAccent}`}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
         <GripVertical className="h-3.5 w-3.5 text-slate-300 opacity-50 group-hover:opacity-100 cursor-grab active:cursor-grabbing" />
      </div>

      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">{nome}</span>
          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {dateDisplay}
          </span>
        </div>
      </div>

      <div className="px-3 pb-1.5 flex items-center gap-3 text-[11px] text-slate-500">
        {medico && (
          <span className="flex items-center gap-1 truncate">
            <Stethoscope className="h-3 w-3 text-slate-400 shrink-0" />
            {medico}
          </span>
        )}
        {plano && (
          <span className="flex items-center gap-1 truncate">
            <Shield className="h-3 w-3 text-slate-400 shrink-0" />
            {plano}
          </span>
        )}
      </div>

      <div className="px-3 pb-1.5 flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className={`text-[9px] uppercase font-bold border-none px-1.5 py-0 rounded-sm ${
            consulta.tipo === "telemedicina"
              ? "bg-blue-100 text-blue-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {consulta.tipo === "telemedicina" ? "Tele" : "Presencial"}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[9px] uppercase font-bold border-none px-1.5 py-0 rounded-sm ${
            isRetorno ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {isRetorno ? "Retorno" : "Consulta"}
        </Badge>
      </div>

      {tags.length > 0 && (
        <div className="px-3 pb-1.5 flex items-center gap-1.5 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0 rounded-sm ${tag.bg} ${tag.text}`}
            >
              {tag.icon}
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {onMove && onMarkRetorno && (
        <div className="px-3 pb-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isRetorno && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRetorno(consulta.id); }}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center gap-0.5"
              title="Marcar como Retorno"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Retorno
            </button>
          )}
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={(e) => { e.stopPropagation(); onMove(consulta.id, t.id); }}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 truncate max-w-[72px]"
              title={`Mover para ${t.label}`}
            >
              {t.emoji} {t.label.split(" ")[0]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Draggable Card ───────── */

function DraggableCard(props: {
  consulta: Consulta;
  columnId: string;
  cardAccent: string;
  allConsultas: Consulta[];
  onMove: (id: string, targetCol: string) => void;
  onMarkRetorno: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: props.consulta.id,
    data: { consulta: props.consulta, columnId: props.columnId },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30">
        <CardBody {...props} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <CardBody {...props} />
    </div>
  );
}

/* ───────── Droppable Column ───────── */

function DroppableColumn({
  col,
  cards,
  allConsultas,
  onMove,
  onMarkRetorno,
  showSeparator,
}: {
  col: ColumnDef;
  cards: Consulta[];
  allConsultas: Consulta[];
  onMove: (id: string, targetCol: string) => void;
  onMarkRetorno: (id: string) => void;
  showSeparator: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.id,
  });

  return (
    <div className="flex items-stretch shrink-0">
      {showSeparator && (
        <div className="flex flex-col items-center justify-center px-2 shrink-0">
          <div className="w-px flex-1 bg-slate-300/60 rounded-full" />
          <span className="text-[9px] font-bold text-slate-400 py-2" style={{ writingMode: "vertical-rl" }}>
            EXCEÇÕES
          </span>
          <div className="w-px flex-1 bg-slate-300/60 rounded-full" />
        </div>
      )}

      <div
        ref={setNodeRef}
        className={`flex flex-col min-w-[210px] max-w-[230px] rounded-xl border transition-all ${
          isOver ? "border-emerald-500 ring-2 ring-emerald-500/20 scale-[1.02]" : col.colBorder
        } ${col.colBg} ${col.isException ? "opacity-80" : ""}`}
      >
        <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.headerBg}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px]">{col.emoji}</span>
            <span className={`text-[12px] font-bold ${col.headerText} truncate`}>
              {col.label}
            </span>
          </div>
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 ${col.headerText} shrink-0`}>
            {cards.length}
          </span>
        </div>

        <div className="px-3 py-1 border-b border-slate-200/40">
          <span className="text-[10px] text-slate-400 font-medium">{col.sub}</span>
        </div>

        <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
          {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <span className="text-2xl mb-1 opacity-40">{col.emoji}</span>
              <span className="text-[11px] font-medium">Nenhum</span>
            </div>
          )}
          {cards.map((consulta) => (
            <DraggableCard
              key={consulta.id}
              consulta={consulta}
              columnId={col.id}
              cardAccent={col.cardAccent}
              allConsultas={allConsultas}
              onMove={onMove}
              onMarkRetorno={onMarkRetorno}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Main Board ───────── */

export function KanbanBoard() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [activeConsulta, setActiveConsulta] = useState<Consulta | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchConsultas = async () => {
    const { data } = await supabase
      .from("consultas")
      .select("*, pacientes(*), medicos(*)");

    if (data) setConsultas(data);
  };

  useEffect(() => {
    fetchConsultas();

    const channel = supabase
      .channel("realtime-kanban-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultas" }, () => {
        fetchConsultas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const columnData = useMemo(() => {
    const map: Record<string, Consulta[]> = {};
    COLUMNS.forEach((c) => { map[c.id] = []; });
    consultas.forEach((c) => {
      const colId = assignColumn(c);
      if (map[colId]) map[colId].push(c);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    );
    return map;
  }, [consultas]);

  const moveCard = async (id: string, targetCol: string) => {
    const newStatus = COL_TO_STATUS[targetCol];
    setConsultas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    await supabase.from("consultas").update({ status: newStatus }).eq("id", id);
  };

  const markRetorno = async (id: string) => {
    setConsultas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, motivo: "retorno" } : c))
    );
    await supabase.from("consultas").update({ motivo: "retorno" }).eq("id", id);
  };

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current as { consulta: Consulta; columnId: string } | undefined;
    if (data) {
      setActiveConsulta(data.consulta);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveConsulta(null);

    if (over && active.id !== over.id) {
      const consultaId = active.id as string;
      const targetCol = over.id as string;
      moveCard(consultaId, targetCol);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full overflow-x-auto pb-6" style={{ scrollbarWidth: "thin" }}>
        {COLUMNS.map((col, i) => {
          const cards = columnData[col.id] || [];
          const showSeparator = col.isException && !COLUMNS[i - 1]?.isException;

          return (
            <DroppableColumn
              key={col.id}
              col={col}
              cards={cards}
              allConsultas={consultas}
              onMove={moveCard}
              onMarkRetorno={markRetorno}
              showSeparator={!!showSeparator}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
        {activeConsulta ? (
          <CardBody
            consulta={activeConsulta}
            columnId={assignColumn(activeConsulta)}
            cardAccent={COLUMNS.find(c => c.id === assignColumn(activeConsulta))?.cardAccent || ""}
            allConsultas={consultas}
            isOverlay={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
