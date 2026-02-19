import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#0D50B8", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"];

export default function Reports() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Dispute.list("-created_date", 500).then(d => {
      setDisputes(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statusData = ["new", "in_progress", "submitted", "pending", "won", "lost"].map(s => ({
    name: s.replace("_", " "),
    count: disputes.filter(d => d.status === s).length,
  }));

  const reasonData = disputes.reduce((acc, d) => {
    if (d.reason_category) {
      acc[d.reason_category] = (acc[d.reason_category] || 0) + 1;
    }
    return acc;
  }, {});
  const reasonChartData = Object.entries(reasonData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Analytics and insights</p>
      </div>

      {loading ? (
        <p className="text-slate-400 py-8 text-center">Loading...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-100">
            <CardHeader><CardTitle className="text-base font-semibold text-slate-800">Disputes by Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0D50B8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader><CardTitle className="text-base font-semibold text-slate-800">Disputes by Reason Category</CardTitle></CardHeader>
            <CardContent>
              {reasonChartData.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={reasonChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {reasonChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}