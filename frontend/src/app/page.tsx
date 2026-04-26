import Link from 'next/link';
import { ArrowRight, Code, Users, Zap, Trophy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <Link className="flex items-center justify-center font-bold text-xl tracking-tighter" href="#">
          <Code className="h-6 w-6 text-primary mr-2" />
          <span className="hidden sm:inline-block">Event OS</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:underline underline-offset-4 hidden sm:inline-block" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4 hidden sm:inline-block" href="#sponsors">
            Sponsors
          </Link>
          <Link href="/auth/login">
            <Button variant="outline" className="hidden sm:flex">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background via-muted/50 to-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1 text-sm font-medium text-muted-foreground mb-4">
                <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                The Ultimate Hackathon Command Center
              </div>
              <div className="space-y-2 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                  Elevate Your Hackathon Experience.
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed mt-4">
                  A centralized, automated, and scalable platform to manage end-to-end hackathon operations, registrations, judging, and transparent finance management.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2 mt-8 flex flex-col sm:flex-row gap-2 justify-center">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8" asChild>
                  <Link href="/auth/register?role=admin">
                    Host an Event <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8" asChild>
                  <Link href="/auth/register?role=participant">
                    Join as Participant
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl border-b pb-4">Features Engineered for Scale</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed">
                  Everything you need to orchestrate the perfect event, from dragging your first form field to handing out the final certificate.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 md:grid-cols-2">
              <div className="group relative overflow-hidden rounded-2xl border bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Code className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Dynamic Registration Builder</h3>
                <p className="text-muted-foreground">Drag and drop custom forms, conditional logic, and enforce team constraints effortlessly.</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Smart Judging Engine</h3>
                <p className="text-muted-foreground">Automated project allocations via expertise, custom scoring rubrics, and live ranking ties.</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Transparent Finance Tracking</h3>
                <p className="text-muted-foreground">Reconcile bank statements, track expenses vs budgets, and process reimbursements fast.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/20">
        <p className="text-xs text-muted-foreground">
          © 2026 Event OS. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
