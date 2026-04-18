"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ConsultaFull = {
  id: string;
  paciente_id: string;
  status: string;
  data_hora: string;
  tipo: string;
  pacientes?: {
    nome: string;
    telefone: string;
    plano_saude: string | null;
  };
};

export function PatientTable() {
  const [data, setData] = useState<ConsultaFull[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: result } = await supabase
        .from("consultas")
        .select("*, pacientes(nome, telefone, plano_saude)")
        .order("data_hora", { ascending: false });

      if (result) setData(result);
    };

    fetchData();

    const channel = supabase.channel('realtime-table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' }, () => {
         fetchData();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
       case 'finalizado': return 'bg-slate-100 text-slate-600 outline-slate-200';
       case 'em atendimento': return 'bg-blue-50 text-blue-700 outline-blue-200';
       case 'agendado': return 'bg-amber-50 text-amber-700 outline-amber-200';
       case 'aguardando': return 'bg-orange-50 text-orange-700 outline-orange-200';
       default: return 'bg-slate-50 text-slate-600 outline-slate-200';
    }
  }

  return (
    <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
       <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Base Histórica de Pacientes</h2>
            <p className="text-sm text-slate-500 font-medium">Listagem completa de consultas e cadastros.</p>
          </div>
       </div>

       <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow className="border-slate-100 hover:bg-slate-50">
                <TableHead className="w-[300px] font-semibold text-slate-600">Paciente</TableHead>
                <TableHead className="font-semibold text-slate-600">Contato</TableHead>
                <TableHead className="font-semibold text-slate-600">Plano</TableHead>
                <TableHead className="font-semibold text-slate-600">Data e Hora</TableHead>
                <TableHead className="font-semibold text-slate-600">Tipo</TableHead>
                <TableHead className="text-right font-semibold text-slate-600">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id} className="border-slate-50 hover:bg-slate-50/80 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                       <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-bold">
                            {row.pacientes?.nome?.substring(0, 2).toUpperCase() || 'P'}
                          </AvatarFallback>
                       </Avatar>
                       <span className="text-slate-700 font-bold">{row.pacientes?.nome || "Anônimo"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium">{row.pacientes?.telefone || "-"}</TableCell>
                  <TableCell>
                     <Badge variant="outline" className="text-slate-500 font-semibold border-slate-200">
                        {row.pacientes?.plano_saude || "Particular"}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">
                     {format(new Date(row.data_hora), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                     <span className="text-sm font-medium text-slate-500 capitalize">{row.tipo}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`outline-1 outline ${getStatusColor(row.status)} border-none shadow-none font-bold uppercase text-[10px] tracking-wider px-2 py-0.5`}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}

              {data.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-medium">
                       Nenhuma consulta encontrada no banco de dados.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
       </div>
    </div>
  )
}
