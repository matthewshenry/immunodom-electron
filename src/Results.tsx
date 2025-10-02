// src/Results.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import Button from "@mui/joy/Button";
import { API_URL } from "./constants";
import { bridgeFetch } from "./api";

type TableColumn = { name: string; display_name?: string };
type PeptideTable = {
  type: "peptide_table";
  table_columns: TableColumn[];
  table_data: any[][];
};

type ResultsResponse = {
  id: string;
  type: "result";
  status?: "pending" | "running" | "done" | "error";
  data?: {
    results?: Array<PeptideTable | any>;
    errors?: any[];
    warnings?: any[];
    input_data?: any;
  };
};

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: { result_id?: string; results_uri?: string; type?: string };
  };

  const resultId = location.state?.result_id;
  const resultsUri = location.state?.results_uri;
  const pollUrl = resultsUri || (resultId ? `${API_URL}/results/${resultId}` : "");

  const [status, setStatus] = useState<string>("pending");
  const [error, setError] = useState<string | null>(null);
  const [peptideTable, setPeptideTable] = useState<PeptideTable | null>(null);

  // Poll /results/{id} until status === "done"
  useEffect(() => {
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | null = null;

    if (!pollUrl) {
      setError("No results handle provided.");
      return;
    }

    const poll = async () => {
      try {
        const { ok, status, statusText, data } = await bridgeFetch<ResultsResponse>(pollUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!ok) {
          throw new Error(`Polling failed (${status}): ${statusText}`);
        }
        const json = data;

        // NG Tools returns "status" in the payload; when 'done', results are included.
        // https://nextgen-tools.iedb.org/docs/api/endpoints/api_references.html
        const s = (json?.status as ResultsResponse["status"]) || (json?.data?.results ? "done" : "pending");
        if (!cancelled) setStatus(s);

        if (s === "done") {
          const errs = json?.data?.errors;
          if (errs && errs.length) {
            throw new Error(`IEDB returned ${errs.length} error(s): ${JSON.stringify(errs[0])}`);
          }
          const pt = json?.data?.results?.find(
            (r: any) => r && r.type === "peptide_table"
          ) as PeptideTable | undefined;

          if (!pt) {
            throw new Error("Results finished, but no peptide_table was returned.");
          }

          if (!cancelled) setPeptideTable(pt);
          return; // stop polling
        }

        if (!cancelled) {
          t = setTimeout(poll, 2000);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Error while polling results.");
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [pollUrl]);

  // Convert table rows into array of objects for easier rendering/graphing
  const rows = useMemo(() => {
    if (!peptideTable) return [];
    const cols = peptideTable.table_columns || [];
    return peptideTable.table_data.map((row) => {
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => {
        obj[c.name || `col_${i}`] = row[i];
      });
      return obj;
    });
  }, [peptideTable]);

  const heading = useMemo(() => {
    if (status === "done") return "Results";
    if (status === "running") return "Running...";
    return "Submitting...";
  }, [status]);

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: 3 }}>
      <Typography variant="h5" gutterBottom>{heading}</Typography>

      {error && (
        <Box sx={{ my: 2, color: "error.main" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>{error}</Typography>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </Box>
      )}

      {!error && status !== "done" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body1">
            Polling IEDB ({status}). This may take a bit depending on inputs…
          </Typography>
        </Box>
      )}

      {!error && status === "done" && peptideTable && (
        <>
          <Typography variant="body2" sx={{ mb: 1, fontStyle: "italic" }}>
            Peptide table returned by IEDB NG Tools.
          </Typography>

          <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  {peptideTable.table_columns.map((c, i) => (
                    <th key={i} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      {c.display_name || c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peptideTable.table_data.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((cell, ci) => (
                      <td key={ci} style={{ padding: 8, borderBottom: "1px solid #f4f4f4" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* === Hook for your chart ===
              If your existing graph expects certain columns (e.g., "percentile" vs "peptide"),
              you can map `rows` into your chart component here.
              Example fields shown in docs include: peptide, length, start, end, allele, score, percentile...
              https://nextgen-tools.iedb.org/docs/api/endpoints/api_references.html
          */}
        </>
      )}
    </Box>
  );
}
