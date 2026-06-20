"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PayStructureTab } from "@/components/analytics/pay-structure-tab";
import { WorkforceTab } from "@/components/analytics/workforce-tab";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Total Rewards: build pay structures from your grades, model scenarios, and analyze real employee pay against them."
      />
      <Tabs defaultValue="structure">
        <TabsList>
          <TabsTrigger value="structure">Pay structure</TabsTrigger>
          <TabsTrigger value="workforce">Workforce & pay analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="structure">
          <PayStructureTab />
        </TabsContent>
        <TabsContent value="workforce">
          <WorkforceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
