import ChatInterface from "@/components/chat/ChatInterface";
import HomeAurora from "@/components/home/HomeAurora";

export default function NewProjectPage() {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <HomeAurora />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12">
        <ChatInterface />
      </div>
    </main>
  );
}
