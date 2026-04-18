"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal, Phone, MoreVertical, Search, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type WhatsAppMessage = {
  id: string;
  telefone: string;
  message: string;
  from_me: boolean;
  created_at: string;
};

export function ChatArea() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeNumber, setActiveNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("whatsapp_mensagens")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        setMessages(data.reverse());
        if(!activeNumber) setActiveNumber(data[data.length - 1].telefone);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel("realtime-chat-premium")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_mensagens" },
        (payload) => {
          const newMsg = payload.new as WhatsAppMessage;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whatsapp_mensagens" },
        (payload) => {
          setMessages((prev) => 
            prev.map(msg => msg.id === payload.new.id ? (payload.new as WhatsAppMessage) : msg)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeNumber]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !activeNumber) return;

    const payloadText = inputText;
    setInputText("");

    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: activeNumber, text: payloadText })
      });
    } catch (e) {
      console.error("Erro ao enviar mensagem", e);
    }
  };

  const filteredMessages = messages.filter(m => m.telefone === activeNumber);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] w-full relative">
      {/* Header Premium do WhatsApp Web Style */}
      <header className="h-[76px] bg-slate-50 flex items-center justify-between px-4 border-b border-slate-200/80 shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 shadow-sm border border-slate-200">
             <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
               {activeNumber ? "PC" : "??"}
             </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="text-[15px] font-semibold text-slate-800 leading-tight">
              {activeNumber ? `+${activeNumber}` : "Nenhum chat selecionado"}
            </h2>
            <span className="text-xs text-emerald-600 font-medium">Online (via Evolution)</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
           <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Search className="h-5 w-5" /></button>
           <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><MoreVertical className="h-5 w-5" /></button>
        </div>
      </header>
      
      {/* Área de Mensagens (Wallpaper texturizado invisível) */}
      <div className="flex-1 overflow-hidden relative bg-[#EBE5DE]" style={{backgroundImage: "url('https://i.ibb.co/3s1f9bT/wa-bg.png')", backgroundSize: "cover", backgroundBlendMode: "overlay", backgroundColor: "rgba(255,255,255,0.7)"}}>
        <ScrollArea className="h-full w-full p-4">
          <div className="flex flex-col gap-2 pb-6 px-1">
            <div className="flex justify-center mb-6">
               <span className="bg-slate-100/80 text-slate-600 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-lg backdrop-blur-sm mt-4 shadow-sm border border-slate-200/50">
                 Hj, Conversa Iniciada
               </span>
            </div>

            {filteredMessages.map((msg, index) => {
              const showTail = index === filteredMessages.length - 1 || filteredMessages[index + 1]?.from_me !== msg.from_me;
              
              return (
                <div key={msg.id} className={`flex w-full ${msg.from_me ? "justify-end" : "justify-start"} mb-1`}>
                  <div 
                    className={`max-w-[85%] sm:max-w-[75%] px-3 py-2 text-[14px] leading-snug break-words shadow-sm relative group
                      ${msg.from_me 
                        ? "bg-[#d9fdd3] text-slate-800 rounded-l-xl rounded-tr-xl" + (showTail ? " rounded-br-none" : " rounded-br-xl")
                        : "bg-white text-slate-800 rounded-r-xl rounded-tl-xl" + (showTail ? " rounded-bl-none border border-slate-100" : " rounded-bl-xl border border-slate-100")}
                    `}
                  >
                    {msg.message?.includes("<img") || msg.message?.includes("<video") || msg.message?.includes("<a href") ? (
                      <div 
                        className="[&>img]:w-full [&>img]:h-auto [&>img]:rounded-md [&>img]:mb-1 [&>video]:w-full [&>video]:rounded-md [&>a]:underline [&>a]:font-medium [&>a]:text-blue-600"
                        dangerouslySetInnerHTML={{ __html: msg.message }} 
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.message}</span>
                    )}
                    
                    <div className="flex items-center justify-end gap-1 mt-1 ml-4 float-right opacity-70">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      {msg.from_me && <CheckCheck className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.5} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} className="h-1" />
          </div>
        </ScrollArea>
      </div>

      {/* Input de Mensagem */}
      <footer className="h-20 bg-slate-50 px-4 py-3 flex items-center gap-3 shrink-0">
        <form 
          className="flex w-full items-center gap-2 bg-white px-2 py-2 rounded-xl shadow-sm border border-slate-200 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition-all"
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
        >
          <Input 
            placeholder="Digite uma mensagem..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 border-none shadow-none focus-visible:ring-0 text-slate-700 bg-transparent"
            autoComplete="off"
          />
          <Button 
            type="submit" 
            size="icon" 
            className={`rounded-lg h-9 w-9 transition-colors ${inputText.trim() ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            disabled={!inputText.trim()}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
