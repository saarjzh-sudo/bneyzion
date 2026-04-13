import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Users, Calendar, Video, Crown, Clock, ArrowLeft, Sparkles, GraduationCap, Lock, CheckCircle2, Shield, Award, Headphones, MessageCircle, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunityCoursesPublic, useMyEnrollments, useNextSession } from "@/hooks/useCourseEnrollment";
import { useMemberAccess } from "@/hooks/useCommunity";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import SmartAuthCTA from "@/components/auth/SmartAuthCTA";

const CommunityPage = () => {
  const { user } = useAuth();
  const { data: courses, isLoading } = useCommunityCoursesPublic();
  const { data: enrollments = [] } = useMyEnrollments();
  const { data: nextSession } = useNextSession();
  const { data: member } = useMemberAccess(user?.email ?? undefined);
  const isMember = !!member && member.status === "active";

  useSEO({
    title: "קהילת הלומדים | לחיות תנ״ך",
    description: "קורסים שבועיים עם רבנים מובילים, מפגשי זום, שיעורים מוקלטים ועוד",
  });

  const enrolledIds = new Set(enrollments.map((e: any) => e.course_id));
  const weeklyCourses = courses?.filter((c: any) => c.course_type === "weekly") ?? [];
  const onDemandCourses = courses?.filter((c: any) => c.course_type !== "weekly") ?? [];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0">
          <img src="/images/hero-biblical-landscape.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
        <div className="container relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm px-4 py-1.5 rounded-full mb-5"
            >
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">קהילת לומדים</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading text-white mb-4 leading-tight">
              קהילת הלומדים של בני ציון
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
              קורסים שבועיים עם רבנים מובילים, מפגשי זום חיים, שיעורים מוקלטים ותעודות
            </p>

            {isMember ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-primary text-primary-foreground border-0 text-sm px-4 py-1.5">
                <Crown className="h-3.5 w-3.5 ml-1" /> חבר קהילה
              </Badge>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                {user ? (
                  <Button size="lg" className="gap-2 text-base px-8 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" onClick={() => document.getElementById("courses-tabs")?.scrollIntoView({ behavior: "smooth" })}>
                    <Sparkles className="h-4 w-4" /> הצטרף לקהילה
                  </Button>
                ) : (
                  <Link to="/auth?redirect=/community">
                    <Button size="lg" className="gap-2 text-base px-8 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                      <Sparkles className="h-4 w-4" /> הצטרף לקהילה
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-4 text-white/60 text-sm">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> קורסים שבועיים</span>
                  <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> מפגשי זום</span>
                  <span className="flex items-center gap-1"><Crown className="h-3.5 w-3.5" /> תעודות</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      <div className="container py-10 space-y-10">
        {/* Next Session Banner */}
        {nextSession && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-l from-primary/10 to-transparent border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">המפגש הבא שלך</p>
              <p className="font-heading text-foreground">{nextSession.title}</p>
              <p className="text-sm text-muted-foreground">
                {nextSession.community_courses?.title} · {new Date(nextSession.session_date).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {nextSession.zoom_link && (
              <a href={nextSession.zoom_link} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">
                  <Video className="h-4 w-4" /> הצטרף לזום
                </Button>
              </a>
            )}
          </motion.div>
        )}

        {/* My Courses */}
        {user && enrollments.length > 0 && (
          <section>
            <h2 className="text-2xl font-heading text-foreground mb-5 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              הקורסים שלי
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.map((e: any, i: number) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/community/${e.course_id}`}>
                    <Card className="hover:shadow-lg hover:border-primary/30 transition-all group overflow-hidden">
                      {e.community_courses?.image_url && (
                        <div className="h-32 overflow-hidden">
                          <img src={e.community_courses.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-heading text-foreground group-hover:text-primary transition-colors line-clamp-2">{e.community_courses?.title}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          {e.community_courses?.rabbis?.name && <span>{e.community_courses.rabbis.name}</span>}
                          <span>·</span>
                          <span>{e.community_courses?.course_type === "weekly" ? "שבועי זום" : "מוקלט"}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {e.completed ? "הושלם ✓" : "בלמידה"}
                          </Badge>
                          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Tabbed Content */}
        <div id="courses-tabs">
          <Tabs defaultValue="weekly" dir="rtl">
            <TabsList className="mb-6 bg-muted/50 w-full sm:w-auto justify-start">
              <TabsTrigger value="weekly" className="gap-1.5">
                <Video className="h-3.5 w-3.5" /> קורסים שבועיים
              </TabsTrigger>
              <TabsTrigger value="open" className="gap-1.5">
                <Headphones className="h-3.5 w-3.5" /> קורסים פתוחים
              </TabsTrigger>
              <TabsTrigger value="benefits" className="gap-1.5">
                <Crown className="h-3.5 w-3.5" /> מה כלול
              </TabsTrigger>
            </TabsList>

            {/* Weekly Courses */}
            <TabsContent value="weekly">
              <div className="mb-4">
                <p className="text-muted-foreground">מפגש שבועי קבוע עם הרב, אינטראקציה חיה ומעקב התקדמות</p>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
                </div>
              ) : weeklyCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {weeklyCourses.map((course: any, i: number) => (
                    <CourseCard key={course.id} course={course} enrolled={enrolledIds.has(course.id)} isMember={isMember} index={i} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Video} text="בקרוב — קורסים שבועיים חדשים!" />
              )}
            </TabsContent>

            {/* Open / On-Demand Courses */}
            <TabsContent value="open">
              <div className="mb-4">
                <p className="text-muted-foreground">שיעורים מוקלטים ללמידה עצמאית בקצב שלך</p>
              </div>
              {onDemandCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {onDemandCourses.map((course: any, i: number) => (
                    <CourseCard key={course.id} course={course} enrolled={enrolledIds.has(course.id)} isMember={isMember} index={i} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={BookOpen} text="בקרוב — קורסים מוקלטים!" />
              )}
            </TabsContent>

            {/* What's Included */}
            <TabsContent value="benefits">
              <MembershipBenefits />
            </TabsContent>
          </Tabs>
        </div>

        {/* CTA for non-members */}
        {!user && (
          <section className="text-center py-10">
            <SmartAuthCTA variant="enroll" />
          </section>
        )}
      </div>
    </Layout>
  );
};

/* ───────── Course Card ───────── */
const CourseCard = ({ course, enrolled, isMember, index }: { course: any; enrolled: boolean; isMember: boolean; index: number }) => {
  const rabbi = course.rabbis as any;
  const canAccess = enrolled || isMember;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link to={`/community/${course.id}`}>
        <Card className="group hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden h-full relative">
          {/* Image */}
          <div className="relative h-40 overflow-hidden bg-muted">
            {course.image_url ? (
              <img src={course.image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <GraduationCap className="h-12 w-12 text-primary/30" />
              </div>
            )}
            {/* Badges */}
            <div className="absolute top-3 right-3 flex gap-1.5">
              <Badge className="bg-card/90 text-foreground border-0 backdrop-blur-sm text-[10px]">
                {course.course_type === "weekly" ? "שבועי זום" : "מוקלט"}
              </Badge>
              {enrolled && (
                <Badge className="bg-primary text-primary-foreground border-0 text-[10px]">
                  <CheckCircle2 className="h-2.5 w-2.5 ml-0.5" /> נרשמת
                </Badge>
              )}
            </div>
            {/* Price */}
            {course.price > 0 && (
              <div className="absolute bottom-3 left-3">
                <Badge className="bg-card/90 text-foreground border-0 backdrop-blur-sm font-bold">₪{course.price}</Badge>
              </div>
            )}
            {course.price === 0 && (
              <div className="absolute bottom-3 left-3">
                <Badge className="bg-primary/90 text-primary-foreground border-0 backdrop-blur-sm font-bold">חינם</Badge>
              </div>
            )}
            {/* Lock overlay for non-members */}
            {!canAccess && (
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-card/90 backdrop-blur-sm rounded-full p-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <CardContent className="p-4 space-y-2">
            <h3 className="font-heading text-foreground group-hover:text-primary transition-colors line-clamp-2 text-lg">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
            )}
            {/* Rabbi + meta */}
            <div className="flex items-center gap-3 pt-1">
              {rabbi && (
                <div className="flex items-center gap-1.5">
                  {rabbi.image_url ? (
                    <img src={rabbi.image_url} alt="" className="h-6 w-6 rounded-full object-cover border border-border" loading="lazy" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{rabbi.name?.[0]}</div>
                  )}
                  <span className="text-xs text-muted-foreground">{rabbi.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-auto">
                <Clock className="h-3 w-3" />
                {course.total_lessons} שיעורים
              </div>
            </div>
            {/* CTA */}
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                <ArrowLeft className="h-3.5 w-3.5" /> פרטים והרשמה
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

/* ───────── Empty State ───────── */
const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="text-center py-16 text-muted-foreground">
    <Icon className="h-12 w-12 mx-auto mb-3 text-border" />
    <p className="text-lg">{text}</p>
  </div>
);

/* ───────── Membership Benefits ───────── */
const benefits = [
  { icon: Video, title: "מפגשי זום שבועיים", desc: "שיעורים חיים עם רבנים מובילים, שאלות ותשובות בזמן אמת" },
  { icon: Headphones, title: "כל השיעורים המוקלטים", desc: "גישה מלאה לארכיון שיעורים מוקלטים בווידאו ואודיו" },
  { icon: FileText, title: "חומרי לימוד", desc: "מצגות, סיכומים ומקורות להורדה לכל שיעור" },
  { icon: MessageCircle, title: "קהילת לומדים", desc: "קבוצת WhatsApp ייעודית, דיונים ושיתוף בין חברי הקהילה" },
  { icon: Award, title: "תעודות סיום", desc: "תעודת סיום קורס מטעם בני ציון בסיום כל מסלול" },
  { icon: Shield, title: "גישה עדיפה", desc: "גישה מוקדמת לקורסים חדשים, הנחות על מוצרים והטבות בלעדיות" },
];

const MembershipBenefits = () => (
  <div className="space-y-8">
    <div className="text-center max-w-xl mx-auto">
      <h3 className="text-2xl font-heading text-foreground mb-2">מה כלול בחברות הקהילה?</h3>
      <p className="text-muted-foreground">חברי הקהילה נהנים ממגוון הטבות ותכנים בלעדיים</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {benefits.map((b, i) => (
        <motion.div
          key={b.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card className="h-full border-border hover:border-primary/20 transition-colors">
            <CardContent className="p-5 flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading text-foreground mb-1">{b.title}</h4>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  </div>
);

export default CommunityPage;
