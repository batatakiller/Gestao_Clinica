"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";

type Consulta = {
  id: string;
  paciente_id: string;
  status: string;
  data_hora: string;
  tipo: string;
  motivo?: string; // Trazendo a nova coluna 'motivo' que acabou de ser criada no servidor
  pacientes?: {
    nome: string;
    telefone: string;
  };
};

const COLUMNS = ["Aguardando", "Agendado", "Triagem", "Em Atendimento"];

export function KanbanBoard() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);

  const fetchConsultas = async () => {
    const { data } = await supabase
      .from("consultas")
      .select("*, pacientes(*)")
      .in("status", COLUMNS.map((c) => c.toLowerCase()));

    if (data) setConsultas(data);
  };

  useEffect(() => {
    fetchConsultas();

    const channel = supabase
      .channel("realtime-consultas-kanban")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultas" }, () => {
          fetchConsultas();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const moveCard = async (id: string, novoStatus: string) => {
    setConsultas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: novoStatus.toLowerCase() } : c))
    );
    await supabase.from("consultas").update({ status: novoStatus.toLowerCase() }).eq("id", id);
  };

  const setComoRetorno = async (id: string) => {
    setConsultas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, motivo: "retorno" } : c))
    );
    await supabase.from("consultas").update({ motivo: "retorno" }).eq("id", id);
  }

  return (
    <div className="flex h-full w-full gap-4 pb-2">
      {COLUMNS.map((coluna) => (
        <div key={coluna} className="flex flex-col flex-1 min-w-[240px] max-w-[280px] bg-[#F1F5F9] border border-slate-200/60 rounded-xl p-3 shadow-none">
          <div className="flex items-start justify-between mb-3 px-1">
             <h2 className="font-bold text-slate-800 text-[15px]">{coluna}</h2>
          </div>
          
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-1 scrollbar-thin">
            {consultas
              .filter((c) => c.status === coluna.toLowerCase())
              .sort((a,b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
              .map((consulta) => {
                
                const formatTime = new Date(consulta.data_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const nomeRaw = consulta.pacientes?.nome || "Paciente Anônimo";
                // Limitar primeiro e último nome
                const nomeParts = nomeRaw.split(" ");
                const nomeCurto = nomeParts.length > 1 ? `${nomeParts[0]} ${nomeParts[nomeParts.length - 1]}` : nomeRaw;
                
                const isRetorno = consulta.motivo === 'retorno';

                return (
                <Card key={consulta.id} className="cursor-grab active:cursor-grabbing border-slate-200 shadow-sm hover:shadow-md transition-all group bg-white rounded-xl">
                  <span className="sr-only font-mono text-[10px] text-slate-400 block px-4 pt-2">font-mono, text-ss</span>
                  <CardHeader className="px-4 py-2 flex flex-col items-start gap-1 space-y-0 relative">
                    
                    <CardTitle className="text-[14px] font-bold text-slate-800 leading-none">
                      {nomeCurto} - {formatTime}
                    </CardTitle>
                    <div className="text-[11px] font-mono text-slate-400">font-mono, text-ss</div>
                    
                    {/* Botão flutuante para Marcar Retorno */}
                    <button 
                      onClick={() => isRetorno ? null : setComoRetorno(consulta.id)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Marcar como Retorno"
                    >
                      <RotateCcw className={`h-3 w-3 ${isRetorno ? 'text-amber-500' : 'text-slate-400'}`} />
                    </button>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 flex flex-col gap-2">
                    <div className="flex justify-start items-center gap-2 mt-1">
                      
                      {/* Telemedicina vs Presencial (Verde pra ambos no seu mockup dependendo) */}
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] uppercase font-bold border-none px-2 py-0.5 rounded-sm ${
                          consulta.tipo === 'telemedicina' 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {consulta.tipo === 'telemedicina' ? "Telemedicina" : "Presencial"}
                      </Badge>

                      {/* Consulta vs Retorno */}
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] uppercase font-bold border-none px-2 py-0.5 rounded-sm ${
                          isRetorno
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isRetorno ? "Retorno" : (consulta.motivo || "Consulta")}
                      </Badge>
                    </div>

                    {/* Botão de Move state */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {COLUMNS.map((c) => (
                        c !== coluna && (
                          <button
                            key={c}
                            onClick={() => moveCard(consulta.id, c)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-[9px] font-bold uppercase truncate max-w-[80px]"
                          >
                            {c.split(' ')[0]}
                          </button>
                        )
                      ))}
                    </div>

                  </CardContent>
                </Card>
              )})}
              
              {consultas.filter((c) => c.status === coluna.toLowerCase()).length === 0 && (
                 <div className="flex flex-col items-start px-2 py-4">
                    <p className="text-[13px] font-medium text-slate-400">Nenhum atendimento</p>
                 </div>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
