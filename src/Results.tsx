// src/Results.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Joyride, { Step } from "react-joyride";
import LineGraph from "./LineGraph";
import { useLocation, useNavigate } from "react-router-dom";
import {
  SelectChangeEvent,
  Select,
  MenuItem,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Modal,
  IconButton,
  CircularProgress,
  TextField,
} from "@mui/material";
import Stack from "@mui/joy/Stack";
import LinearProgress from "@mui/material/LinearProgress";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DownloadIcon from "@mui/icons-material/Download";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import HelpIcon from "@mui/icons-material/Help";
import CloseIcon from "@mui/icons-material/Close";
import Slider from "@mui/material/Slider";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import { API_URL } from "./constants";
import { ScaleType } from "recharts/types/util/types";
import html2canvas from "html2canvas";
import { bridgeFetch } from "./api";

type TableColumn = { name: string; display_name?: string };
type PeptideTable = {
  type: "peptide_table";
  table_columns: TableColumn[];
  table_data: any[][];
};
type ResultsResponse = {
  id?: string;
  type?: "result";
  status?: "pending" | "running" | "done" | "error";
  data?: {
    results?: Array<PeptideTable | any>;
    errors?: any[];
    warnings?: any[];
    input_data?: any;
  };
};
type DataRowGraph = {
  allele: string;
  seq_num: number;
  start: number;
  end: number;
  length: number;
  peptide: string;
  core_peptide: string;
  score: number | null;
  percentile_rank: number;
  kd: number;
  sequence_text: string;
  method: string;
  datasetIndex: number;
  color: string;
};

// helpers 
const generateColors = (n: number) =>
  Array.from(
    { length: n },
    (_, i) => `hsl(${(i * 360) / Math.max(1, n)}, 50%, 40%)`
  );

const pickCol = (cols: TableColumn[], aliases: string[]): number => {
  const norm = cols.map((c) =>
    (c.name || c.display_name || "").toLowerCase().trim()
  );
  for (const a of aliases) {
    const i = norm.indexOf(a.toLowerCase());
    if (i >= 0) return i;
  }
  for (let i = 0; i < norm.length; i++) {
    if (aliases.some((a) => norm[i].includes(a.toLowerCase()))) return i;
  }
  return -1;
};

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      result_id?: string;
      results_uri?: string;
      type?: "mhci" | "mhcii";
    };
  };
  const runType = location.state?.type || "mhci";
  const resultId = location.state?.result_id;
  const resultsUri = location.state?.results_uri;
  const pollUrl = resultsUri || (resultId ? `${API_URL}/results/${resultId}` : "");

  // refs for downloads
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // ui state (copied from  web app)
  const [progress, setProgress] = useState(0);
  const [totalRequests, setTotalRequests] = useState(1); // single NG run
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false); // placeholder
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lineThickness, setLineThickness] = useState(2);
  const [yAxisRange, setYAxisRange] = useState(5000);
  const [scaleType, setScaleType] = useState<ScaleType>("log");

  const [tourActive, setTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Results data (graph + table)
  const [status, setStatus] = useState<ResultsResponse["status"]>("pending");
  const [peptideTable, setPeptideTable] = useState<PeptideTable | null>(null);
  const [dataForGraph, setDataForGraph] = useState<DataRowGraph[][]>([]);
  const [dataForTable, setDataForTable] = useState<any[]>([]);
  // preserve full unfiltered version of graph data
  const [allGraphData, setAllGraphData] = useState<DataRowGraph[][]>([]);
  const [filteredDataForTable, setFilteredDataForTable] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  const [alleleOptions, setAlleleOptions] = useState<string[]>([]);
  const [selectedAlleleIndices, setSelectedAlleleIndices] = useState<number[]>(
    []
  );
  const submitTs = (location.state?.submit_ts as number) || null;
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const hasLoggedFinal = useRef(false);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchType, setSearchType] = useState<"peptide" | "core_peptide">(
    "peptide"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [startRange, setStartRange] = useState<{ start: any; end: any | null }>(
    { start: null, end: null }
  );
  const [kdStart, setKdStart] = useState<string | null>(null);
  const [kdEnd, setKdEnd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kdError, setKdError] = useState<React.ReactNode | null>(null);
  const [startError, setStartError] = useState(false);
  const [endError, setEndError] = useState(false);
  const [kdStartError, setKdStartError] = useState(false);
  const [kdEndError, setKdEndError] = useState(false);

  // Poll new gen IEDB tools until done
  useEffect(() => {

    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | null = null;

    if (!pollUrl) {
      setErrorMessage("No results handle provided.");
      return;
    }

    setTotalRequests(1);
    setProgress(0);

    const poll = async () => {
      try {
        const {
          ok,
          status: http,
          statusText,
          data,
        } = await bridgeFetch<ResultsResponse>(pollUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!ok) throw new Error(`Polling failed (${http}): ${statusText}`);

        const s =
          (data?.status as ResultsResponse["status"]) ||
          (data?.data?.results ? "done" : "pending");
        if (!cancelled) setStatus(s);

        if (s === "done") {
          const errs = data?.data?.errors;
          if (errs && errs.length)
            throw new Error(`IEDB returned error: ${JSON.stringify(errs[0])}`);

          const pt = data?.data?.results?.find(
            (r: any) => r && r.type === "peptide_table"
          ) as PeptideTable | undefined;
          if (!pt)
            throw new Error(
              "Results finished, but no peptide_table was returned."
            );

          if (!cancelled) {
            setPeptideTable(pt);
            setProgress(1);
          }
          const pollEndTime = performance.now();
          const elapsed = ((pollEndTime - pollStartTime) / 1000).toFixed(2);
          console.log(`[Timing] Polling completed in ${elapsed}s at ${new Date().toISOString()}`);
          return;
        }

        if (!cancelled) {
          setProgress(0.4); // arbitrary LMAO
          t = setTimeout(poll, 2000);
        }
      } catch (e: any) {
        if (!cancelled)
          setErrorMessage(e.message || "Error while polling results.");
      }
    };
    //track the overall poll duration
    const pollStartTime = performance.now();
    //console.log(`[Timing] Polling started at ${new Date().toISOString()}`);
    poll();
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [pollUrl]);

  // Adapt peptide_table -> DataRowGraph[][] (one dataset per allele)
  useEffect(() => {
    if (!peptideTable) return;

    const cols = peptideTable.table_columns || [];
    const idxAllele = pickCol(cols, ["allele"]);
    const idxStart = pickCol(cols, ["start"]);
    const idxEnd = pickCol(cols, ["end"]);
    const idxLength = pickCol(cols, ["length", "peptide_length"]);
    const idxCore = pickCol(cols, ["core_peptide", "core"]);
    const idxPeptide = pickCol(cols, ["peptide"]);
    const idxIC50  = pickCol(cols, ["ic50","kd","affinity"]);
    const idxScore = pickCol(cols, ["score"]);
    const idxRank = pickCol(cols, ["percentile", "percentile_rank", "rank"]);
    const idxSeqTxt = pickCol(cols, ["sequence_text", "input_sequence", "input"]);
    const idxMethod = pickCol(cols, ["method", "predictor", "tool"]);
    const idxSeqNum = pickCol(cols, [
      "seq_num",
      "sequence_index",
      "sequence_no",
    ]);

    // Normalize rows
    const normalized: DataRowGraph[] = (peptideTable.table_data || []).map(
      (r, i) => {
        const allele = idxAllele >= 0 ? String(r[idxAllele]) : "Unknown";
        const start = idxStart >= 0 ? Number(r[idxStart]) : i + 1;
        const end = idxEnd >= 0 ? Number(r[idxEnd]) : start;
        const length =
          idxLength >= 0 ? Number(r[idxLength]) : Math.max(1, end - start + 1);
        const core = idxCore >= 0 ? String(r[idxCore]) : "";
        const peptide = idxPeptide >= 0 ? String(r[idxPeptide]) : "";
        const ic50 = idxIC50 >= 0 ? Number(r[idxIC50]) : NaN;
        const score = idxScore >= 0 ? Number(r[idxScore]) : NaN;
        //calculate kd if not given, doesn't seem to be given usually
        let kdVal: number | null = null;
        if (Number.isFinite(ic50)) kdVal = ic50;
        else if (Number.isFinite(score))
          kdVal = Math.round(Math.pow(50000, 1 - score));
        const rankVal = idxRank >= 0 ? Number(r[idxRank]) : NaN;
        const seqTxt = idxSeqTxt >= 0 ? String(r[idxSeqTxt]) : "";
        const method = idxMethod >= 0 ? String(r[idxMethod]) : "";
        const seqNum = idxSeqNum >= 0 ? Number(r[idxSeqNum]) : 1;

        return {
          allele,
          seq_num: isFinite(seqNum) ? seqNum : 1,
          start,
          end,
          length,
          core_peptide: core,
          peptide,
          kd: kdVal,
          score: Number.isFinite(score) ? score : null,
          percentile_rank: isFinite(rankVal) ? rankVal : NaN,
          sequence_text: seqTxt,
          method,
          datasetIndex: 0,
          color: "#000",
        };
      }
    );

    const KD_THRESHOLD = 10000;
    const filtered = normalized.filter(
      (row) =>
        Number.isFinite(row.kd as number) && (row.kd as number) < KD_THRESHOLD
    );

    // Group by allele
    const byAllele = new Map<string, DataRowGraph[]>();
    for (const row of filtered) {
      if (!byAllele.has(row.allele)) byAllele.set(row.allele, []);
      byAllele.get(row.allele)!.push(row);
    }

    // Sort each series by start, assign colors + datasetIndex
    const alleleList = Array.from(byAllele.keys());
    const colors = generateColors(alleleList.length);
    const series: DataRowGraph[][] = [];

    alleleList.forEach((allele, i) => {
      const arr = (byAllele.get(allele) || [])
        .slice()
        .sort((a, b) => a.start - b.start);
      const color = colors[i];
      arr.forEach((r) => {
        r.datasetIndex = i + 1;
        r.color = color;
      });
      series.push(arr);
    });

    setAlleleOptions(alleleList);
    setSelectedAlleleIndices(alleleList.map((_, i) => i)); // default: select all
    setAllGraphData(series);
    // no filtering yet, set graph data on first load
    if (dataForGraph.length === 0) {
      setDataForGraph(series);
    }

    // Table + CSV
    const merged = series.flat().filter((d) => d.kd !== null);
    setDataForTable(merged);
    setFilteredDataForTable(merged);

    if (merged.length > 0) {
      const headers = Object.keys(merged[0]).filter(
        (h) => h !== "color" && h !== "seq_num"
      );
      const idx = headers.indexOf("sequence_text");
      if (idx > -1) {
        headers.splice(idx, 1);
        headers.push("sequence_text");
      }
      setCsvHeaders(["datasetIndex", ...headers]);
    }
  }, [peptideTable]);

  useEffect(() => {
    if (!submitTs) return;
    let raf: number;
    let running = true;

    const tick = () => {
      if (!running) return;
      setElapsedSec(((Date.now() - submitTs) / 1000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [submitTs]);

  useEffect(() => {
  if (!submitTs) return;
  if (hasLoggedFinal.current) return;

  const graphReady = status === "done" && dataForGraph.length > 0;
  if (graphReady) {
    const totalSec = ((Date.now() - submitTs) / 1000).toFixed(2);
    hasLoggedFinal.current = true;
    console.log(`[Timing] Submit→Graph loaded in ${totalSec}s`);
  }
}, [submitTs, status, dataForGraph]);


  // controls
  const handleResultChange = (event: SelectChangeEvent<number[]>) => {
    const val = event.target.value as number[];

    if (val.includes(-1)) {
      // Toggle Select All
      if (selectedAlleleIndices.length === alleleOptions.length) {
        // Unselect all
        setSelectedAlleleIndices([]);
        setDataForGraph([]);
        setFilteredDataForTable([]);
      } else {
        // Select all
        setSelectedAlleleIndices(alleleOptions.map((_, i) => i));
        setDataForGraph(allGraphData);
        setFilteredDataForTable(dataForTable);
      }
      return;
    }

    // Normal filtering logic
    setSelectedAlleleIndices(val);

    const filteredGraph = allGraphData.filter((_, i) => val.includes(i));
    setDataForGraph(filteredGraph);

    const selectedAlleles = new Set(val.map((i) => alleleOptions[i]));
    const filteredTable = dataForTable.filter((r) =>
      selectedAlleles.has(r.allele)
    );
    setFilteredDataForTable(filteredTable);
  };



  const handleDownload = () => {
    if (!chartContainerRef.current) return;
    html2canvas(chartContainerRef.current, { useCORS: true })
      .then((canvas) => {
        const img = canvas.toDataURL("image/jpeg");
        const a = document.createElement("a");
        a.href = img;
        a.download = "graph.jpeg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch((e) => console.error("Capture failed:", e));
  };

  const handleDownloadCSV = () => {
    const headers = Array.from(new Set(csvHeaders));
    const rows = [
      headers,
      ...filteredDataForTable.map((row) =>
        headers.map((h) => (h === "datasetIndex" ? row[h] ?? 0 : row[h]))
      ),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLineThicknessChange = (_: Event, value: number | number[]) =>
    setLineThickness(value as number);
  const handleYAxisRangeChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setYAxisRange(Number(e.target.value));
  const handleScaleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setScaleType(e.target.value as ScaleType);

  const handleCloseError = () => setErrorMessage(null);
  const handleOpenSettings = () => setSettingsOpen(true);
  const handleCloseSettings = () => setSettingsOpen(false);

  // search/filter
  const applyFilter = useCallback(() => {
    if (
      !searchQuery &&
      startRange.start === null &&
      startRange.end === null &&
      kdStart === null &&
      kdEnd === null
    ) {
      setFilteredDataForTable(dataForTable);
      return;
    }

    const startValue =
      startRange.start === "" ? null : Number(startRange.start);
    let endValue = startRange.end === "" ? null : Number(startRange.end);
    const kdStartValue = kdStart == null ? null : Number(kdStart);
    const kdEndValue = kdEnd == null || kdEnd === "" ? 20000 : Number(kdEnd);

    if (startRange.start && endValue && Number(startRange.start) > endValue) {
      setError("Start value must be less than or equal to end value.");
      setStartError(true);
      setEndError(true);
      return;
    }
    if (
      kdStartValue !== null &&
      kdEndValue !== null &&
      kdStartValue > kdEndValue
    ) {
      setKdError(
        <Typography variant="body2" component="span">
          K<sub>d</sub> start value must be less than or equal to K<sub>d</sub>{" "}
          end value.
        </Typography>
      );
      return;
    }

    let hasError = false;
    if (startValue !== null && isNaN(startValue)) {
      setError("Start value must be a valid number.");
      setStartError(true);
      hasError = true;
    } else setStartError(false);

    if (endValue !== null && isNaN(endValue)) {
      setError("End value must be a valid number.");
      setEndError(true);
      hasError = true;
    } else setEndError(false);

    if (kdStartValue !== null && isNaN(kdStartValue)) {
      setKdError(
        <Typography variant="body2" component="span">
          K<sub>d</sub> start value must be a valid number.
        </Typography>
      );
      setKdStartError(true);
      hasError = true;
    } else setKdStartError(false);

    if (kdEndValue !== null && isNaN(kdEndValue)) {
      setKdError(
        <Typography variant="body2" component="span">
          K<sub>d</sub> end value must be a valid number.
        </Typography>
      );
      setKdEndError(true);
      hasError = true;
    } else setKdEndError(false);

    if (startRange.end === null || startRange.end === "" || startRange.end === 0) {
      endValue = Math.max(...dataForTable.map((row) => row.start));
    }
    if (endValue !== null && endValue < 1) {
      setError("End value must be greater than zero.");
      setEndError(true);
      hasError = true;
    } else setEndError(false);

    if (hasError) return;

    const searchLower = (searchQuery || "").toLowerCase();
    const filtered = dataForTable.filter((row) => {
      const peptideMatch =
        searchType === "peptide" &&
        row.peptide?.toLowerCase().includes(searchLower);
      const coreMatch =
        searchType === "core_peptide" &&
        row.core_peptide?.toLowerCase().includes(searchLower);
      const startMatch =
        endValue !== null
          ? row.start >= startValue && row.start <= endValue
          : row.start >= startValue;
      const kdMatch =
        kdStartValue !== null && kdEndValue !== null
          ? row.kd >= kdStartValue && row.kd <= kdEndValue
          : kdStartValue !== null
          ? row.kd >= kdStartValue
          : kdEndValue !== null
          ? row.kd <= kdEndValue
          : true;

      const peptideCond = searchType === "peptide" ? peptideMatch : true;
      const coreCond = searchType === "core_peptide" ? coreMatch : true;
      const startCond =
        startRange.start !== null || startRange.end !== null
          ? startMatch
          : true;
      const kdCond =
        kdStartValue !== null || kdEndValue !== null ? kdMatch : true;

      return peptideCond && coreCond && startCond && kdCond;
    });

    setFilteredDataForTable(filtered);
    setSearchModalOpen(false);
    setError(null);
    setKdError(null);
  }, [searchQuery, startRange, kdStart, kdEnd, searchType, dataForTable]);

  // joyride steps (kept)
  const steps: Step[] = [
    {
      target: ".result-dropdown",
      content: "Choose which alleles (datasets) to overlay on the graph.",
    },
    {
      target: ".line-graph-container",
      content: "Drag to zoom; click a point for details.",
    },
    { target: ".download-icon", content: "Download the graph as an image." },
    {
      target: ".settings-icon",
      content: "Change line thickness, Y range, or scale.",
    },
    { target: ".search-icon", content: "Filter the CSV table." },
    { target: ".clear-filter-icon", content: "Clear the current filters." },
    { target: ".download-csv-icon", content: "Download the CSV table." },
  ];

  // render
  return (
    <div>
      <Joyride
        steps={steps.map((s, i) =>
          i === 0 ? { ...s, disableBeacon: true } : s
        )}
        continuous
        showProgress
        showSkipButton
        run={tourActive}
        stepIndex={stepIndex}
        scrollToFirstStep={false}
        disableScrolling
        spotlightClicks
        spotlightPadding={0}
        styles={{ beacon: { display: "none" } }}
        callback={(data) => {
          const { action, index, status, type } = data;
          if (
            status === "finished" ||
            status === "skipped" ||
            action === "close"
          ) {
            setTourActive(false);
            setStepIndex(0);
          } else if (type === "step:after") {
            if (action === "next") setStepIndex(index + 1);
            else if (action === "prev") setStepIndex(index - 1);
          }
        }}
      />

      <Box
        sx={{
          padding: 2,
          border: "1px solid #ddd",
          borderRadius: 8,
          backgroundColor: "#f7f7f7",
          boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
          width: 1000,
          margin: "auto",
          marginTop: 4,
          position: "relative",
        }}
      >
        <Typography variant="h4" gutterBottom textAlign="center">
          {runType === "mhcii" ? "MHC-II Results" : "MHC-I Results"}
        </Typography>

        <Stack spacing={1} sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={(progress / totalRequests) * 100}
          />
          <div style={{ color: "#6c757d", fontSize: "0.875rem" }}>
            {`${Math.round((progress / totalRequests) * 100)}%`}
          </div>
        </Stack>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <Select<number[]>
              multiple
              value={selectedAlleleIndices}
              onChange={handleResultChange}
              sx={{ width: "100%", maxWidth: 400 }}
              className="result-dropdown"
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: "auto",
                    whiteSpace: "normal",
                  },
                },
              }}
              renderValue={(selected) => {
                const sel = selected as number[];
                const display = sel.slice(0, 2).map((i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    component="div"
                    sx={{ wordBreak: "break-word" }}
                  >
                    {i === -1 ? "Select All" : `Allele: ${alleleOptions[i]}`}
                  </Typography>
                ));
                const more = sel.length - 2;
                return (
                  <div>
                    {display}
                    {more > 0 && (
                      <Typography
                        variant="body2"
                        component="div"
                      >{`+${more} more`}</Typography>
                    )}
                  </div>
                );
              }}
            >
              <MenuItem value={-1}>
                <Typography variant="body2" component="div">
                  Select All
                </Typography>
              </MenuItem>
              {alleleOptions.map((a, i) => (
                <MenuItem
                  key={a}
                  value={i}
                  style={{
                    whiteSpace: "normal",
                    wordBreak: "break-all",
                    maxWidth: 400,
                  }}
                >
                  <Typography variant="body2" component="div">
                    Allele: {a}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              mt: 4,
            }}
          >
            {status !== "done" ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body1">
                  Polling IEDB ({status})…
                </Typography>
              </Box>
            ) : (
              <>
                {/* Graph */}
                <Box
                  ref={chartContainerRef}
                  className="line-graph-container"
                  sx={{
                    width: "90%",
                    maxWidth: 900,
                    height: 500,
                    mb: 3,
                  }}
                >
                  <LineGraph
                    dataSets={dataForGraph}
                    width={900}
                    height={500}
                    lineThickness={lineThickness}
                    yAxisRange={yAxisRange}
                    scaleType={scaleType}
                    colors={generateColors(Math.max(1, dataForGraph.length))}
                    chartContainerRef={chartContainerRef}
                  />
                </Box>

                {/* Responsive, wrapping legend below graph */}
                {dataForGraph.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: 1.5,
                      backgroundColor: "#fff",
                      borderRadius: 2,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                      p: 2,
                      mb: 4,
                      width: "90%",
                      maxWidth: 900,
                      opacity: dataForGraph.length > 0 ? 1 : 0,
                      transition: "opacity 0.3s ease-in-out",
                    }}
                  >
                    {dataForGraph.map((alleleSet, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          border: "1px solid #e0e0e0",
                          backgroundColor: "#fff",
                        }}
                      >
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            backgroundColor: alleleSet[0]?.color || "#555",
                            mr: 1,
                          }}
                        />
                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.primary",
                                fontWeight: 500,
                              }}
                            >
                              {alleleSet[0]?.allele || `Set ${idx + 1}`}
                            </Typography>
                          </Box>
                        ))}
                  </Box>
                )}

                {/* Buttons aligned under legend */}
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <IconButton
                    color="primary"
                    disabled={loadingSave}
                    className="bookmark-icon"
                  >
                    {loadingSave ? (
                      <CircularProgress size={24} />
                    ) : (
                      <BookmarkIcon />
                    )}
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={handleDownload}
                    className="download-icon"
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={handleOpenSettings}
                    className="settings-icon"
                  >
                    <SettingsIcon />
                  </IconButton>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* CSV Table */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            mt: 2,
            mb: 2,
          }}
        >
          {/* Table Borders and Padding */}
          <Paper
            elevation={3}
            sx={{
              width: "100%",
              borderRadius: 2,
              border: "2px solid #ddd",
              backgroundColor: "#ffffff",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              p: 2,
              opacity: filteredDataForTable.length > 0 ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
          >
            {/* Table Header Row with Search and Download Icons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
                px: 1,
              }}
            >
               {/* Search and Clear Filter Icons */}
              <Box 
              sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  color="primary"
                  onClick={() => setSearchModalOpen(true)}
                  className="search-icon"
                >
                  <SearchIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={() => {
                    setFilteredDataForTable(dataForTable);
                    setSearchQuery("");
                    setSearchType("peptide");
                    setStartRange({ start: null, end: null });
                    setKdStart(null);
                    setKdEnd(null);
                  }}
                  className="clear-filter-icon"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              {/* Title Text */}
              <Typography
                variant="h6"
                gutterBottom
                sx={{ flexGrow: 1, textAlign: "center", fontWeight: 600 }}
              >
                CSV Data
              </Typography>
              
              <IconButton
                color="primary"
                onClick={handleDownloadCSV}
                className="download-csv-icon"
              >
                <DownloadIcon />
              </IconButton>
            </Box>
              {/* Actual Data Table */}
            <TableContainer component={Paper} 
            sx={{ 
              borderRadius: 2, 
              maxHeight: 600 
              }}
            >
              <Table stickyHeader>
                {/* Table Column Headers */}
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f4f4f4" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Data Set</TableCell>
                    {csvHeaders
                      .filter((h) => h !== "datasetIndex")
                      .map((h) => (
                        <TableCell
                          key={h}
                          sx={{ fontWeight: 600, textTransform: "capitalize" }}
                        >
                          {h === "kd" ? (
                            <span>
                              K<sub>d</sub>
                            </span>
                          ) : (
                            h
                          )}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                {/* Table Body Rows */}
                <TableBody>
                  {filteredDataForTable.map((row, i) => (
                    <TableRow
                      key={i}
                      sx={{
                        "&:nth-of-type(odd)": { backgroundColor: "#fafafa" },
                        "&:hover": { backgroundColor: "#f1f1f1" },
                      }}
                    >
                      {/* First Column with Data Set Index and Color Dot */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              backgroundColor: row.color,
                              mr: 1,
                            }}
                          />
                          {row.datasetIndex}
                        </Box>
                      </TableCell>
                      {/* Other Columns */}
                      {csvHeaders
                        .filter(
                          (h) => h !== "sequence_text" && h !== "datasetIndex"
                        )
                        .map((h) => (
                          <TableCell key={h}>
                            {typeof row[h] === "number"
                              ? row[h].toFixed(3)
                              : String(row[h])}
                          </TableCell>
                        ))}
                      <TableCell>
                        <Typography
                          sx={{
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                          }}
                        >
                          {String(row.sequence_text || "")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
      {/* Error modal */}
      <Modal open={!!errorMessage} onClose={handleCloseError}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            border: "2px solid #f44336",
            boxShadow: 24,
            p: 4,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseError}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography
            component="h2"
            sx={{ fontSize: "2rem", fontWeight: "bold", mb: 2 }}
          >
            Unexpected Error
          </Typography>
          <Typography sx={{ mt: 2, color: "#f44336" }}>
            {errorMessage}
          </Typography>
        </Box>
      </Modal>

      {/* Settings modal */}
      <Modal open={settingsOpen} onClose={handleCloseSettings}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            border: "2px solid #000",
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography variant="h2" component="h2">
            Settings
          </Typography>
          <Box mt={2}>
            <Typography variant="body2">Line Thickness</Typography>
            <Slider
              value={lineThickness}
              onChange={handleLineThicknessChange as any}
              step={1}
              marks
              min={1}
              max={5}
            />
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <FormLabel component="legend">
                Y Axis Range (lower bound for{" "}
                {scaleType === "log" ? "log" : "linear"})
              </FormLabel>
              <RadioGroup value={yAxisRange} onChange={handleYAxisRangeChange}>
                <FormControlLabel value={500} control={<Radio />} label="500" />
                <FormControlLabel
                  value={5000}
                  control={<Radio />}
                  label="5000"
                />
                <FormControlLabel
                  value={20000}
                  control={<Radio />}
                  label="20000"
                />
              </RadioGroup>
            </FormControl>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Scale Type
            </Typography>
            <RadioGroup value={scaleType} onChange={handleScaleTypeChange}>
              <FormControlLabel
                value="linear"
                control={<Radio />}
                label="Linear"
              />
              <FormControlLabel
                value="log"
                control={<Radio />}
                label="Logarithmic"
              />
            </RadioGroup>
          </Box>
          <Button onClick={handleCloseSettings} sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Modal>

      {/* Search modal */}
      <Modal open={searchModalOpen} onClose={() => setSearchModalOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            border: "2px solid #000",
            boxShadow: 24,
            p: 4,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              applyFilter();
              setSearchModalOpen(false);
              e.preventDefault();
            }
          }}
        >
          {error && <Typography color="error">{error}</Typography>}
          {kdError && <Typography color="error">{kdError}</Typography>}
          <Typography variant="h6" component="h2">
            Advanced Search
          </Typography>
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <FormLabel component="legend">Search Type</FormLabel>
            <RadioGroup
              value={searchType}
              onChange={(e) =>
                setSearchType(e.target.value as "peptide" | "core_peptide")
              }
            >
              <FormControlLabel
                value="peptide"
                control={<Radio />}
                label="Peptide"
              />
              <FormControlLabel
                value="core_peptide"
                control={<Radio />}
                label="Core Peptide"
              />
            </RadioGroup>
          </FormControl>
          <TextField
            label="Search"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: "100%", mt: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <FormLabel component="legend">Peptide Position</FormLabel>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Minimum"
              variant="outlined"
              value={startRange.start ?? ""}
              onChange={(e) => {
                setStartError(false);
                setStartRange((prev) => ({ ...prev, start: e.target.value }));
              }}
              error={startError}
              sx={{ width: "100%" }}
            />
            <TextField
              label="Maximum"
              variant="outlined"
              value={startRange.end ?? ""}
              onChange={(e) => {
                setEndError(false);
                setStartRange((prev) => ({ ...prev, end: e.target.value }));
              }}
              error={endError}
              sx={{ width: "100%" }}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <FormLabel component="legend">
              k<sub>d</sub> Range
            </FormLabel>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Minimum"
              variant="outlined"
              value={kdStart ?? ""}
              onChange={(e) => setKdStart(e.target.value)}
              error={kdStartError}
              sx={{ width: "100%" }}
            />
            <TextField
              label="Maximum"
              variant="outlined"
              value={kdEnd ?? ""}
              onChange={(e) => setKdEnd(e.target.value)}
              error={kdEndError}
              sx={{ width: "100%" }}
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={applyFilter}
            sx={{ mt: 2 }}
            disabled={startError || endError || kdStartError || kdEndError}
          >
            Apply Filter
          </Button>
        </Box>
      </Modal>

      <IconButton
        className="help-icon"
        color="primary"
        onClick={() => {
          setTourActive(true);
          setStepIndex(0);
        }}
        sx={{ position: "fixed", bottom: 16, right: 16 }}
      >
        <HelpIcon />
      </IconButton>
    </div>
  );
}
