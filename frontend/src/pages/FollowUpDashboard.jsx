import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function FollowUpDashboard() {
  const [loading, setLoading] = useState(true);
  const [absentees, setAbsentees] = useState([]);
  const [activeTab, setActiveTab] = useState("absentees"); // "absentees"

  useEffect(() => {
    fetchFollowUpData();
  }, []);

  async function fetchFollowUpData() {
    try {
      setLoading(true);
      // Fetch absentees via the database RPC function
      const { data: absenteeData, error } = await supabase.rpc("get_missed_services", { p_last: 3 });
      if (error) {
        console.error("Error fetching absentees:", error);
      } else {
        setAbsentees(absenteeData || []);
      }
    } catch (err) {
      console.error("Exception fetching follow-up data:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-Up & Care</h1>
          <p className="text-gray-500 text-sm">Track members who need retention calls, absentees, and new converts.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("absentees")}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "absentees" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Absentee Watch ({absentees.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            {activeTab === "absentees" ? "Members Missing 3+ Consecutive Sundays" : "Follow-Up Queue"}
          </h2>
          <button
            onClick={fetchFollowUpData}
            className="text-xs text-emerald-700 hover:underline font-medium"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading follow-up records...</p>
        ) : activeTab === "absentees" ? (
          absentees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Member Name</th>
                    <th className="px-4 py-3">Phone Number</th>
                    <th className="px-4 py-3">Last Seen</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {absentees.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.full_name || item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.phone || "No phone provided"}</td>
                      <td className="px-4 py-3 text-amber-600 font-medium">{item.last_seen || "Over 3 weeks ago"}</td>
                      <td className="px-4 py-3 text-right">
                        {item.phone ? (
                          <a
                            href={`tel:${item.phone}`}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium transition inline-block"
                          >
                            Call Member
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No number</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Wonderful news! No members have missed the last 3 Sundays.</p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}