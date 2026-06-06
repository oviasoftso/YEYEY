import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Filter, Search, FileText, Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader,CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import OviAvatar from "@/components/OviAvatar";
import { store } from "@/lib/store";
import { SUBJECT_TOPICS, SUBJECT_ICONS } from "@/lib/constants";
import { StudentProfile } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface PastPaper {
  id: string;
  subject: string;
  year: number;
  session: string;
  paper: string;
  topic: string;
  questions: number;
  duration: string;
  difficulty: "Foundation" | "Ordinary" | "Higher";
}

// Demo past paper data — in production, this comes from Supabase
const PAST_PAPERS: PastPaper[] = [
  { id: "1", subject: "Mathematics", year: 2025, session: "November", paper: "Paper 1", topic: "Algebra", questions: 12, duration: "2h 30m", difficulty: "Ordinary" },
  { id: "2", subject: "Mathematics", year: 2025, session: "November", paper: "Paper 2", topic: "Geometry", questions: 10, duration: "2h 30m", difficulty: "Ordinary" },
  { id: "3", subject: "English Language", year: 2025, session: "November", paper: "Paper 1", topic: "Comprehension", questions: 5, duration: "2h", difficulty: "Ordinary" },
  { id: "4", subject: "English Language", year: 2025, session: "November", paper: "Paper 2", topic: "Composition", questions: 4, duration: "1h 30m", difficulty: "Ordinary" },
  { id: "5", subject: "Combined Science", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 40, duration: "1h 30m", difficulty: "Ordinary" },
  { id: "6", subject: "Combined Science", year: 2025, session: "November", paper: "Paper 2", topic: "Mixed", questions: 12, duration: "2h", difficulty: "Ordinary" },
  { id: "7", subject: "Physics", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 40, duration: "1h 30m", difficulty: "Ordinary" },
  { id: "8", subject: "Chemistry", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 40, duration: "1h 30m", difficulty: "Ordinary" },
  { id: "9", subject: "Biology", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 40, duration: "1h 30m", difficulty: "Ordinary" },
  { id: "10", subject: "Accounting", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 8, duration: "3h", difficulty: "Ordinary" },
  { id: "11", subject: "Business Studies", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 8, duration: "2h 30m", difficulty: "Ordinary" },
  { id: "12", subject: "Geography", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 8, duration: "2h 30m", difficulty: "Ordinary" },
  { id: "13", subject: "History", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 8, duration: "2h 30m", difficulty: "Ordinary" },
  { id: "14", subject: "Shona", year: 2025, session: "November", paper: "Paper 1", topic: "Mixed", questions: 6, duration: "2h", difficulty: "Ordinary" },
  { id: "15", subject: "Mathematics", year: 2024, session: "November", paper: "Paper 1", topic: "Algebra", questions: 12, duration: "2h 30m", difficulty: "Ordinary" },
  { id: "16", subject: "Mathematics", year: 2024, session: "November", paper: "Paper 2", topic: "Geometry", questions: 10, duration: "2h 30m", difficulty: "Ordinary" },
  { id: "17", subject: "Combined Science", year: 2024, session: "November", paper: "Paper 1", topic: "Mixed", questions: 40, duration: "1h 30m", difficulty: "Ordinary" },
  { id: "18", subject: "Combined Science", year: 2024, session: "November", paper: "Paper 2", topic: "Mixed", questions: 12, duration: "2h", difficulty: "Ordinary" },
];

const PastPaperVaultPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedPaper, setSelectedPaper] = useState("all");

  useEffect(() => {
    const p = store.getProfile();
    if (!p) { navigate("/"); return; }
    setProfile(p);
  }, [navigate]);

  if (!profile) return null;

  const filtered = PAST_PAPERS.filter((p) => {
    if (selectedSubject !== "all" && p.subject !== selectedSubject) return false;
    if (selectedYear !== "all" && p.year !== parseInt(selectedYear)) return false;
    if (selectedPaper !== "all" && p.paper !== selectedPaper) return false;
    if (searchTerm && !p.subject.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.topic.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    // Only show subjects the student is studying
    if (!profile.subjects.includes(p.subject)) return false;
    return true;
  });

  const subjects = [...new Set(PAST_PAPERS.filter(p => profile.subjects.includes(p.subject)).map(p => p.subject))];
  const years = [...new Set(PAST_PAPERS.map(p => p.year))].sort((a, b) => b - a);

  const startPastPaper = (paper: PastPaper) => {
    toast({
      title: `${paper.subject} ${paper.paper}`,
      description: `Starting ${paper.year} ${paper.session} paper. This will open in the assessment engine.`,
    });
    // Navigate to assessment with pre-filled settings
    navigate("/assessment", {
      state: {
        subject: paper.subject,
        paperType: paper.paper.includes("1") ? "paper1" : "paper2",
        examMode: true,
        pastPaperYear: paper.year,
        pastPaperSession: paper.session,
      },
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OviAvatar size="md" />
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Past Paper Vault</h1>
              <p className="text-muted-foreground text-sm">ZIMSEC past papers — practice with real exam questions</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>{SUBJECT_ICONS[s] || "📚"} {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPaper} onValueChange={setSelectedPaper}>
                <SelectTrigger><SelectValue placeholder="All Papers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Papers</SelectItem>
                  <SelectItem value="Paper 1">Paper 1</SelectItem>
                  <SelectItem value="Paper 2">Paper 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filtered.length} paper{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Papers grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((paper) => (
            <Card key={paper.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => startPastPaper(paper)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{SUBJECT_ICONS[paper.subject] || "📚"}</span>
                    <div>
                      <CardTitle className="text-sm font-semibold">{paper.subject}</CardTitle>
                      <p className="text-xs text-muted-foreground">{paper.paper}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {paper.year}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {paper.session}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {paper.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {paper.questions}Q
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  <Download size={14} />
                  Start Paper
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground mb-2">No Papers Found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters or check back later for more papers.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default PastPaperVaultPage;
