import "@/styles/chapter-weekly.css";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunityCoruses, useMemberAccess } from "@/hooks/useCommunity";
import { BookOpen, Lock, Play, FileText, Headphones, Calendar, Users, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Portal = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: courses, isLoading: coursesLoading } = useCommunityCoruses();
  const { data: member, isLoading: memberLoading } = useMemberAccess(user?.email ?? undefined);

  const isLoading = authLoading || coursesLoading || memberLoading;

  if (!authLoading && !user) {
    return <Navigate to="/auth?redirect=/portal" replace />;
  }

  const isMember = !!member && member.status === "active";

  return (
    <div className="chapter-weekly-theme min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background text-foreground" dir="rtl">
      {/* Header */}
      <header className="py-6 md:py-8 px-4 bg-gradient-to-br from-secondary via-muted to-secondary relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <Link to="/">
            <img
              src="/lovable-uploads/b5f2dd73-fe0b-41e8-8bcd-fc1516514ecf.png"
              alt="לוגו בני ציון"
              className="h-12 md:h-16 mx-auto mb-2 transition-all duration-500 hover:scale-105"
            />
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-l from-primary to-primary/80 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-primary-foreground">
            פורטל הלומדים – לחיות תנ"ך
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90">
            כל התכנים, הקורסים והשיעורים שלך במקום אחד
          </p>
          {member && (
            <div className="mt-4 inline-flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-full">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-primary-foreground font-semibold">
                שלום {member.first_name || user?.email}! חבר/ת קהילה מאז {new Date(member.joined_at).toLocaleDateString('he-IL')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">טוען תכנים...</p>
          </div>
        ) : !isMember ? (
          <Card className="max-w-xl mx-auto border-2 border-primary/30 shadow-xl">
            <CardContent className="p-8 text-center space-y-6">
              <Lock className="w-16 h-16 mx-auto text-primary/50" />
              <h2 className="text-2xl font-bold text-primary">אזור סגור לחברי הקהילה</h2>
              <p className="text-lg text-muted-foreground">
                הפורטל זמין רק למנויי תכנית "לחיות תנ"ך – הפרק השבועי".
              </p>
              <p className="text-muted-foreground">
                המייל {user?.email} לא נמצא ברשימת המנויים.
                <br />
                אם הצטרפת לאחרונה, ייתכן שהמערכת עדיין לא עודכנה.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="text-lg">
                  <Link to="/chapter-weekly">הצטרפו לתכנית</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/contact">צרו קשר</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Weekly update card */}
            <Card className="mb-8 border-2 border-accent/50 shadow-xl bg-gradient-to-br from-card to-accent/10">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl md:text-3xl font-bold text-primary flex items-center justify-center gap-3">
                  <Calendar className="w-7 h-7" />
                  השיעור השבועי
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="p-6 bg-gradient-to-l from-primary/10 to-accent/10 rounded-lg">
                  <p className="text-xl font-bold text-foreground mb-2">
                    כרגע לומדים: ספר נחמיה
                  </p>
                  <p className="text-muted-foreground">
                    כל שבוע מתעדכן עם שיעור חדש, סיכום כתוב והקלטה
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <Play className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="font-semibold text-sm">שיעור זום</p>
                    <p className="text-xs text-muted-foreground">כל שני ב-21:00</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-accent" />
                    <p className="font-semibold text-sm">סיכום כתוב</p>
                    <p className="text-xs text-muted-foreground">יום שלישי</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <Headphones className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="font-semibold text-sm">הקלטה</p>
                    <p className="text-xs text-muted-foreground">זמינה תמיד</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Courses Grid */}
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              הקורסים שלך
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {courses?.map((course) => (
                <Card
                  key={course.id}
                  className="group hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/30 overflow-hidden"
                >
                  <div className="h-2 bg-gradient-to-l from-primary to-accent" />
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {course.total_lessons} שיעורים
                      </Badge>
                    </div>
                    {course.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {course.description}
                      </p>
                    )}
                    <Button asChild variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Link to={`/portal/course/${course.id}`}>
                        כניסה לקורס
                        <ChevronLeft className="w-4 h-4 mr-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* WhatsApp link */}
            <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-card to-primary/5">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold text-primary mb-4">קבוצת הוואטסאפ של הקהילה</h3>
                <p className="text-muted-foreground mb-6">
                  עדכונים, שיתופים ודיונים עם כל חברי הקהילה
                </p>
                <a
                  href="https://chat.whatsapp.com/L1PZWRh8kxdDojWmUDMBs3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl text-lg font-bold inline-flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Users className="w-5 h-5" />
                  הצטרפו לקבוצה
                </a>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Portal;
