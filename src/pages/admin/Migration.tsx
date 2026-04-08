import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MigrationOverview } from "@/components/migration/MigrationOverview";
import { MigrationItemsTable } from "@/components/migration/MigrationItemsTable";
import { RedirectsManager } from "@/components/migration/RedirectsManager";
import { BatchesList } from "@/components/migration/BatchesList";
import { MigrationLogs } from "@/components/migration/MigrationLogs";
import { TagsManager } from "@/components/migration/TagsManager";
import ParashaImportButton from "@/components/migration/ParashaImportButton";
import UmbracoGapScan from "@/components/migration/UmbracoGapScan";

export default function Migration() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading gradient-teal">דשבורד מיגרציה</h1>
          <p className="text-muted-foreground mt-1">ניהול תהליך ההעברה מ-bneyzion.co.il</p>
        </div>

        {/* Parasha Import */}
        <ParashaImportButton />

        <Tabs defaultValue="overview" dir="rtl">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="font-display">סקירה כללית</TabsTrigger>
            <TabsTrigger value="items" className="font-display">פריטי מיגרציה</TabsTrigger>
            <TabsTrigger value="redirects" className="font-display">הפניות SEO</TabsTrigger>
            <TabsTrigger value="tags" className="font-display">תגיות</TabsTrigger>
            <TabsTrigger value="batches" className="font-display">הרצות</TabsTrigger>
            <TabsTrigger value="logs" className="font-display">לוגים</TabsTrigger>
            <TabsTrigger value="gaps" className="font-display">סריקת פערים</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><MigrationOverview /></TabsContent>
          <TabsContent value="items"><MigrationItemsTable /></TabsContent>
          <TabsContent value="redirects"><RedirectsManager /></TabsContent>
          <TabsContent value="tags"><TagsManager /></TabsContent>
          <TabsContent value="batches"><BatchesList /></TabsContent>
          <TabsContent value="logs"><MigrationLogs /></TabsContent>
          <TabsContent value="gaps"><UmbracoGapScan /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
