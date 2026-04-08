import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users as UsersIcon, Crown, UserCheck, UserX, CreditCard, Ban, CheckCircle2, Download } from "lucide-react";
import { useProfiles, useUserRoles, useAddRole, useRemoveRole, useCommunityMembers, useUpdateMemberTier, useUpdateMemberStatus } from "@/hooks/useUsers";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const roleLabels: Record<string, string> = { admin: "מנהל", moderator: "מנהל תוכן", user: "משתמש" };
const roleColors: Record<string, string> = { admin: "bg-primary/10 text-primary", moderator: "bg-accent/10 text-accent", user: "bg-muted text-muted-foreground" };
const tierLabels: Record<string, string> = { standard: "רגיל", premium: "פרימיום", vip: "VIP" };
const statusLabels: Record<string, string> = { active: "פעיל", inactive: "לא פעיל", suspended: "מושעה" };

export default function Users() {
  const { data: profiles, isLoading } = useProfiles();
  const { data: roles } = useUserRoles();
  const { data: members, isLoading: membersLoading } = useCommunityMembers();
  const addRole = useAddRole();
  const removeRole = useRemoveRole();
  const updateTier = useUpdateMemberTier();
  const updateStatus = useUpdateMemberStatus();
  const { toast } = useToast();
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [changingTierFor, setChangingTierFor] = useState<string | null>(null);

  const getUserRoles = (userId: string) => roles?.filter((r) => r.user_id === userId) || [];
  const getMember = (email: string | null) => members?.find((m) => m.email === email);

  // Stats
  const totalUsers = profiles?.length ?? 0;
  const communityCount = members?.filter((m) => m.status === "active").length ?? 0;
  const premiumCount = members?.filter((m) => m.membership_tier === "premium" && m.status === "active").length ?? 0;
  const freeCount = totalUsers - communityCount;

  const handleAddRole = async (userId: string, role: string) => {
    try {
      await addRole.mutateAsync({ user_id: userId, role });
      toast({ title: "הרשאה נוספה" });
      setAddingFor(null);
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      await removeRole.mutateAsync(roleId);
      toast({ title: "הרשאה הוסרה" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const handleChangeTier = async (memberId: string, tier: string) => {
    try {
      await updateTier.mutateAsync({ memberId, tier });
      toast({ title: `דרגה שונתה ל${tierLabels[tier] || tier}` });
      setChangingTierFor(null);
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await updateStatus.mutateAsync({ memberId, status: newStatus });
      toast({ title: newStatus === "active" ? "מנוי הופעל" : "מנוי הושעה" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
  };

  const exportCSV = () => {
    if (!members || members.length === 0) return;
    const headers = ["שם פרטי", "שם משפחה", "אימייל", "טלפון", "דרגה", "סטטוס", "תאריך הצטרפות"];
    const rows = members.map((m) => [m.first_name || "", m.last_name || "", m.email, m.phone || "", tierLabels[m.membership_tier] || m.membership_tier, statusLabels[m.status] || m.status, new Date(m.joined_at).toLocaleDateString("he-IL")]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading gradient-teal">ניהול משתמשים</h1>
            <p className="text-muted-foreground mt-1">ניהול משתמשים, הרשאות ומנויים</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" /> ייצוא CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">סה״כ משתמשים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{freeCount}</p>
                <p className="text-xs text-muted-foreground">חינמי</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{communityCount}</p>
                <p className="text-xs text-muted-foreground">חברי קהילה</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{premiumCount}</p>
                <p className="text-xs text-muted-foreground">פרימיום</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" dir="rtl">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> משתמשים</TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> מנויים</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><Shield className="h-5 w-5" />משתמשים רשומים</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">משתמש</TableHead>
                        <TableHead className="text-right">אימייל</TableHead>
                        <TableHead className="text-right">הרשאות</TableHead>
                        <TableHead className="text-right">דרגת חברות</TableHead>
                        <TableHead className="text-right">נרשם</TableHead>
                        <TableHead className="text-right">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles?.map((p) => {
                        const userRoles = getUserRoles(p.id);
                        const member = getMember(p.email);
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url || ""} /><AvatarFallback className="text-xs">{p.email?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                                <span className="font-medium">{p.full_name || "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell dir="ltr" className="text-left">{p.email}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {userRoles.map((r) => (
                                  <Badge key={r.id} className={`${roleColors[r.role]} cursor-pointer`} onClick={() => { if (confirm("להסיר הרשאה?")) handleRemoveRole(r.id); }}>
                                    {roleLabels[r.role]} ✕
                                  </Badge>
                                ))}
                                {userRoles.length === 0 && <span className="text-muted-foreground text-sm">ללא</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {member ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {member.membership_tier === "premium" && <Crown className="h-2.5 w-2.5 ml-0.5 text-accent" />}
                                    {tierLabels[member.membership_tier] || member.membership_tier}
                                  </Badge>
                                  {changingTierFor === member.id ? (
                                    <Select onValueChange={(v) => handleChangeTier(member.id, v)}>
                                      <SelectTrigger className="w-24 h-7 text-xs"><SelectValue placeholder="בחר" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="standard">רגיל</SelectItem>
                                        <SelectItem value="premium">פרימיום</SelectItem>
                                        <SelectItem value="vip">VIP</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setChangingTierFor(member.id)}>
                                      שנה
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">חינמי</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("he-IL")}</TableCell>
                            <TableCell>
                              {addingFor === p.id ? (
                                <Select onValueChange={(v) => handleAddRole(p.id, v)}>
                                  <SelectTrigger className="w-32"><SelectValue placeholder="בחר הרשאה" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">מנהל</SelectItem>
                                    <SelectItem value="moderator">מנהל תוכן</SelectItem>
                                    <SelectItem value="user">משתמש</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => setAddingFor(p.id)} className="font-display text-xs">
                                  הוסף הרשאה
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {profiles?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין משתמשים רשומים</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><CreditCard className="h-5 w-5" />מנויים פעילים</CardTitle>
              </CardHeader>
              <CardContent>
                {membersLoading ? <p className="text-center py-8 text-muted-foreground">טוען...</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">שם</TableHead>
                        <TableHead className="text-right">אימייל</TableHead>
                        <TableHead className="text-right">דרגה</TableHead>
                        <TableHead className="text-right">תאריך הצטרפות</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="text-right">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members?.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <span className="font-medium">{m.first_name} {m.last_name}</span>
                            {m.badge_label && (
                              <Badge variant="secondary" className="mr-2 text-[10px]">{m.badge_label}</Badge>
                            )}
                          </TableCell>
                          <TableCell dir="ltr" className="text-left">{m.email}</TableCell>
                          <TableCell>
                            {changingTierFor === m.id ? (
                              <Select onValueChange={(v) => handleChangeTier(m.id, v)} defaultValue={m.membership_tier}>
                                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">רגיל</SelectItem>
                                  <SelectItem value="premium">פרימיום</SelectItem>
                                  <SelectItem value="vip">VIP</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-xs">
                                  {m.membership_tier === "premium" && <Crown className="h-2.5 w-2.5 ml-0.5 text-accent" />}
                                  {m.membership_tier === "vip" && <Crown className="h-2.5 w-2.5 ml-0.5 text-primary" />}
                                  {tierLabels[m.membership_tier] || m.membership_tier}
                                </Badge>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setChangingTierFor(m.id)}>שנה</Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(m.joined_at).toLocaleDateString("he-IL")}
                          </TableCell>
                          <TableCell>
                            <Badge className={m.status === "active" ? "bg-primary/10 text-primary border-0" : "bg-destructive/10 text-destructive border-0"}>
                              {statusLabels[m.status] || m.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleToggleStatus(m.id, m.status)}
                            >
                              {m.status === "active" ? (
                                <><Ban className="h-3 w-3" /> השעה</>
                              ) : (
                                <><CheckCircle2 className="h-3 w-3" /> הפעל</>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!members || members.length === 0) && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">אין מנויים עדיין</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
