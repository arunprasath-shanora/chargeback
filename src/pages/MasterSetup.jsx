import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReasonCodeManager from "@/components/mastersetup/ReasonCodeManager";
import CustomFieldManager from "@/components/mastersetup/CustomFieldManager";
import EvidenceTypeManager from "@/components/mastersetup/EvidenceTypeManager";
import CoverLetterManager from "@/components/mastersetup/CoverLetterManager";
import GeographyManager from "@/components/mastersetup/GeographyManager";
import ProcessorManager from "@/components/mastersetup/ProcessorManager";

export default function MasterSetup() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Master Setup</h1>
        <p className="text-slate-500 text-sm mt-1">Configure system-wide settings and reference data</p>
      </div>

      <Tabs defaultValue="reason_codes">
        <TabsList className="bg-slate-100 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger value="reason_codes" className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Reason Codes</TabsTrigger>
          <TabsTrigger value="custom_fields" className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Custom Fields</TabsTrigger>
          <TabsTrigger value="evidence_types" className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Evidence Types</TabsTrigger>
          <TabsTrigger value="cover_letters" className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Cover Letters</TabsTrigger>
          <TabsTrigger value="geography" className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Geography</TabsTrigger>
          <TabsTrigger value="processors" className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Processors</TabsTrigger>
        </TabsList>

        <TabsContent value="reason_codes" className="mt-4">
          <ReasonCodeManager />
        </TabsContent>
        <TabsContent value="custom_fields" className="mt-4">
          <CustomFieldManager />
        </TabsContent>
        <TabsContent value="evidence_types" className="mt-4">
          <EvidenceTypeManager />
        </TabsContent>
        <TabsContent value="cover_letters" className="mt-4">
          <CoverLetterManager />
        </TabsContent>
        <TabsContent value="geography" className="mt-4">
          <GeographyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}