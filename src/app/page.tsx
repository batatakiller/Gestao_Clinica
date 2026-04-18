"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ChatArea } from "@/components/ChatArea";
import { PatientTable } from "@/components/PatientTable";
import { LayoutDashboard, Users, MessageSquare, CalendarDays, Search, Bell, Plus, Rocket, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MetricsInfo = {
  hoje: number;
  amanha: number;
  semana: number;
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricsInfo>({ hoje: 0, amanha: 0, semana: 0 });

  useEffect(() => {
    async function loadMetrics() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
      
      const { data: consultas } = await supabase.from("consultas").select("*");
      
      if (!consultas) return;

      let hojeCount = 0;
      let amanhaCount = 0;
      const semanaCount = consultas.length; 

      consultas.forEach((c) => {
        const cDate = new Date(c.data_hora);
        if (cDate >= today && cDate < tomorrow) hojeCount++;
        else if (cDate >= tomorrow && cDate < dayAfter) amanhaCount++;
      });

      setMetrics({ hoje: hojeCount, amanha: amanhaCount, semana: semanaCount });
    }

    loadMetrics();

    const channel = supabase.channel('metrics-reload')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' }, () => {
         loadMetrics();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex h-screen bg-[#F5F7F9] overflow-hidden font-sans">
      
      {/* Sidebar Dark */}
      <aside className="w-64 bg-[#1E293B] flex flex-col items-center py-6 border-r border-slate-800 shadow-xl shrink-0">
        <div className="flex items-center gap-3 px-6 w-full mb-10">
          <div className="h-8 w-8 text-emerald-400 flex items-center justify-center font-bold text-xl">
             <div className="w-8 h-8 rounded-full border-2 border-emerald-400 flex items-center justify-center">
               <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
             </div>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight">Clínica</span>
            <span className="text-emerald-400 font-bold text-lg leading-tight">Oftalmos</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full px-4 text-slate-400">
           <button className="flex items-center gap-3 w-full bg-emerald-50 text-emerald-800 font-semibold p-3.5 rounded-xl transition-all shadow-sm">
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
           </button>
           <button className="flex items-center gap-3 w-full hover:bg-slate-800/50 hover:text-slate-200 p-3.5 rounded-xl transition-all font-medium">
              <Users className="h-5 w-5" />
              <span>Pacientes</span>
           </button>
           <button className="flex items-center gap-3 w-full hover:bg-slate-800/50 hover:text-slate-200 p-3.5 rounded-xl transition-all font-medium">
              <CalendarDays className="h-5 w-5" />
              <span>CalendarDays</span>
           </button>
           <button className="flex items-center gap-3 w-full hover:bg-slate-800/50 hover:text-slate-200 p-3.5 rounded-xl transition-all font-medium">
              <MessageSquare className="h-5 w-5" />
              <span>Mensagens</span>
           </button>
        </div>
      </aside>

      {/* Main Container - Cockpit Layout */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Navbar */}
        <nav className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10 w-full relative">
           <div className="w-[400px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar paciente ou CPF..." className="pl-10 bg-slate-50 border-slate-200 shadow-none font-medium h-10" />
           </div>
           <div className="flex items-center gap-4">
              <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-2">
                 <Plus className="h-4 w-4" /> Novo Agendamento
              </Button>
              <button className="h-10 w-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-300">
                DR
              </div>
           </div>
        </nav>

        {/* Content Cockpit Grid */}
        <div className="flex-1 overflow-auto flex p-6 gap-6">
           
           {/* Center Column (70%) */}
           <div className="flex-1 flex flex-col gap-6 min-w-[700px] max-w-5xl">
              
              {/* Cockpit KPIs */}
              <div className="flex items-center justify-between w-full">
                 <div>
                   <h1 className="text-3xl font-black text-slate-800 tracking-tight">Olá, Dr. Ramos!</h1>
                   
                   <div className="flex items-center gap-4 border-b border-slate-200 mt-6 -mb-[1px]">
                     <div className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-600 cursor-pointer">
                        <Rocket className="h-4 w-4 text-rose-500" /> Visão Geral & Lista
                     </div>
                     <div className="flex items-center gap-2 pb-2 text-sm font-bold text-sky-600 border-b-2 border-sky-600 cursor-pointer">
                        <Inbox className="h-4 w-4" /> Kanban CRM
                     </div>
                     <div className="flex items-center gap-2 pb-2 text-sm font-medium text-slate-500 cursor-pointer">
                        <MessageSquare className="h-4 w-4" /> Central de Atendimento
                     </div>
                   </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <Card className="bg-emerald-50/80 border-emerald-200 shadow-sm w-44 rounded-xl">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm mb-1"><Users className="h-4 w-4" /> Pacientes Hoje</div>
                        <div className="text-4xl font-bold text-emerald-600 tracking-tight">{metrics.hoje}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-slate-200 shadow-sm w-44 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-full h-1 bg-emerald-500"></div>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm mb-1"><Users className="h-4 w-4 text-emerald-600" /> Pacientes Amanhã</div>
                        <div className="text-4xl font-bold text-emerald-600 tracking-tight">{metrics.amanha}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-cyan-50/80 border-cyan-200 shadow-sm w-44 rounded-xl">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-cyan-800 font-medium text-sm mb-1"><Activity className="h-4 w-4" /> Total da Semana</div>
                        <div className="text-4xl font-bold text-cyan-700 tracking-tight">{metrics.semana.toLocaleString()}</div>
                      </CardContent>
                    </Card>
                 </div>
              </div>

              {/* CRM Wrapper */}
              <div className="h-[420px] bg-transparent mt-2 overflow-x-auto relative rounded-2xl">
                 <KanbanBoard />
              </div>

              {/* Table Wrapper */}
              <div className="flex-1 mt-2 min-h-[300px]">
                 <PatientTable />
              </div>

           </div>

           {/* Right Column (30%) */}
           <div className="w-[400px] h-full shrink-0">
             <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col relative">
                <ChatArea />
             </div>
           </div>

        </div>
      </main>

    </div>
  );
}

import { Activity } from "lucide-react";
