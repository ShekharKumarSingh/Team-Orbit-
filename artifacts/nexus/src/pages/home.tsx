import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, Layers, Zap, Users } from "lucide-react";

export function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/20 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="Nexus" className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Nexus</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        <div className="max-w-3xl space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in zoom-in-95">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
            Nexus 1.0 is here
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-balance">
            Where your team's work <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">connects</span>.
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            A command center for serious teams. Stop hunting for tasks across tools. 
            Bring projects, people, and progress into one dense, focused interface.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-8 text-base group">
                Start Building Now
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                Sign In to Workspace
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-5xl w-full text-left">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Command Center</h3>
            <p className="text-muted-foreground">High-density dashboard giving you immediate visibility into what's blocking your team.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Focused Boards</h3>
            <p className="text-muted-foreground">Fast, keyboard-friendly project boards that get out of your way so you can work.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Instant Sync</h3>
            <p className="text-muted-foreground">Changes propagate instantly. No refreshing required when a teammate updates a task.</p>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} Nexus Command. Built for speed.</p>
      </footer>
    </div>
  );
}