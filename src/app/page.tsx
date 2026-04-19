"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ChatArea } from "@/components/ChatArea";
import { PatientTable } from "@/components/PatientTable";
import {
  LayoutDashboard, Users, MessageSquare, CalendarDays,
  Search, Bell, Plus, Rocket, Inbox, Activity,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MetricsInfo = {
  hoje: number;
  amanha: number;
  semana: number;
  taxaConfirmacao: number;
  faltaram: number;
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricsInfo>({
    hoje: 0, amanha: 0, semana: 0, taxaConfirmacao: 0, faltaram: 0,
  });
  const [activeTab, setActiveTab] = useState<"kanban" | "lista" | "chat">("kanban");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: consultas } = await supabase.from("consultas").select("*");

      if (!consultas) return;

      let hojeCount = 0;
      let amanhaCount = 0;
      let semanaCount = 0;
      let confirmadas = 0;
      let agendadas = 0;
      let faltaram = 0;

      consultas.forEach((c) => {
        const cDate = new Date(c.data_hora);

        if (cDate >= today && cDate < tomorrow) hojeCount++;
        else if (cDate >= tomorrow && cDate < dayAfter) amanhaCount++;

        if (cDate >= today && cDate < weekEnd) semanaCount++;

        if (c.status === "confirmada") confirmadas++;
        if (c.status === "agendada" || c.status === "confirmada") agendadas++;
        if (c.status === "faltou") faltaram++;
      });

      const taxa = agendadas > 0 ? Math.round((confirmadas / agendadas) * 100) : 0;

      setMetrics({
        hoje: hojeCount,
        amanha: amanhaCount,
        semana: semanaCount,
        taxaConfirmacao: taxa,
        faltaram,
      });
    }

    loadMetrics();

    const channel = supabase
      .channel("metrics-reload")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultas" }, () => {
        loadMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#F5F7F9] overflow-hidden font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-60 bg-[#1E293B] flex flex-col items-center py-6 border-r border-slate-800 shadow-xl shrink-0">
        <div className="flex items-center gap-3 px-5 w-full mb-10">
          <div className="h-8 w-8 text-emerald-400 flex items-center justify-center font-bold text-xl">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-400 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight">Clínica</span>
            <span className="text-emerald-400 font-bold text-lg leading-tight">Oftalmos</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-full px-3 text-slate-400">
          <button className="flex items-center gap-3 w-full bg-emerald-50 text-emerald-800 font-semibold p-3 rounded-xl transition-all shadow-sm text-sm">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <button className="flex items-center gap-3 w-full hover:bg-slate-800/50 hover:text-slate-200 p-3 rounded-xl transition-all font-medium text-sm">
            <Users className="h-4 w-4" />
            <span>Pacientes</span>
          </button>
          <button className="flex items-center gap-3 w-full hover:bg-slate-800/50 hover:text-slate-200 p-3 rounded-xl transition-all font-medium text-sm">
            <CalendarDays className="h-4 w-4" />
            <span>Agenda</span>
          </button>
          <button className="flex items-center gap-3 w-full hover:bg-slate-800/50 hover:text-slate-200 p-3 rounded-xl transition-all font-medium text-sm">
            <MessageSquare className="h-4 w-4" />
            <span>Mensagens</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <nav className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10 w-full">
          <div className="w-[360px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar paciente ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200 shadow-none font-medium h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-2 h-9 text-sm">
              <Plus className="h-4 w-4" /> Novo Agendamento
            </Button>
            <button className="h-9 w-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-300 text-sm">
              DR
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto flex p-5 gap-5">
          {/* Center Column */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* KPIs Row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Olá, Dr. Ramos!</h1>
                {/* Tabs */}
                <div className="flex items-center gap-4 border-b border-slate-200 mt-4 -mb-px">
                  <button
                    onClick={() => setActiveTab("kanban")}
                    className={`flex items-center gap-2 pb-2 text-sm font-semibold cursor-pointer transition-colors ${
                      activeTab === "kanban"
                        ? "text-sky-600 border-b-2 border-sky-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Inbox className="h-4 w-4" /> Kanban CRM
                  </button>
                  <button
                    onClick={() => setActiveTab("lista")}
                    className={`flex items-center gap-2 pb-2 text-sm font-semibold cursor-pointer transition-colors ${
                      activeTab === "lista"
                        ? "text-sky-600 border-b-2 border-sky-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Rocket className="h-4 w-4" /> Visão Geral & Lista
                  </button>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex items-center gap-2 pb-2 text-sm font-semibold cursor-pointer transition-colors ${
                      activeTab === "chat"
                        ? "text-sky-600 border-b-2 border-sky-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" /> Central de Atendimento
                  </button>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="flex items-center gap-2 shrink-0">
                <Card className="bg-emerald-50/80 border-emerald-200 shadow-sm w-36 rounded-xl">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-medium text-[11px] mb-0.5">
                      <Users className="h-3.5 w-3.5" /> Hoje
                    </div>
                    <div className="text-3xl font-bold text-emerald-600 tracking-tight">{metrics.hoje}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm w-36 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-0.5 bg-emerald-500" />
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px] mb-0.5">
                      <Users className="h-3.5 w-3.5 text-emerald-600" /> Amanhã
                    </div>
                    <div className="text-3xl font-bold text-emerald-600 tracking-tight">{metrics.amanha}</div>
                  </CardContent>
                </Card>
                <Card className="bg-cyan-50/80 border-cyan-200 shadow-sm w-36 rounded-xl">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-1.5 text-cyan-800 font-medium text-[11px] mb-0.5">
                      <Activity className="h-3.5 w-3.5" /> Semana
                    </div>
                    <div className="text-3xl font-bold text-cyan-700 tracking-tight">{metrics.semana}</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50/80 border-green-200 shadow-sm w-36 rounded-xl">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-1.5 text-green-800 font-medium text-[11px] mb-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmação
                    </div>
                    <div className="text-3xl font-bold text-green-600 tracking-tight">{metrics.taxaConfirmacao}%</div>
                  </CardContent>
                </Card>
                {metrics.faltaram > 0 && (
                  <Card className="bg-red-50/80 border-red-200 shadow-sm w-36 rounded-xl">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-1.5 text-red-800 font-medium text-[11px] mb-0.5">
                        <XCircle className="h-3.5 w-3.5" /> Faltaram
                      </div>
                      <div className="text-3xl font-bold text-red-600 tracking-tight">{metrics.faltaram}</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "kanban" && (
              <div className="flex-1 min-h-0 overflow-hidden rounded-2xl">
                <KanbanBoard searchQuery={searchQuery} />
              </div>
            )}

            {activeTab === "lista" && (
              <div className="flex-1 min-h-[300px]">
                <PatientTable searchQuery={searchQuery} />
              </div>
            )}

            {activeTab === "chat" && (
              <div className="flex-1 min-h-[400px] bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <ChatArea />
              </div>
            )}
          </div>

          {/* Right Column — Chat (always visible on Kanban tab) */}
          {activeTab === "kanban" && (
            <div className="w-[380px] h-full shrink-0">
              <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col relative">
                <ChatArea />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
