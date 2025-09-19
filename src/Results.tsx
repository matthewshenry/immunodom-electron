import React, { useState, useEffect, useRef, useCallback } from 'react';
import Joyride, { Step } from 'react-joyride';
import LineGraph from './LineGraph';
import { useLocation, useNavigate } from 'react-router-dom';
import { SelectChangeEvent, Select, MenuItem, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Modal, IconButton, CircularProgress, TextField } from '@mui/material';
import Stack from '@mui/joy/Stack';
import LinearProgress from '@mui/material/LinearProgress';import axios from 'axios';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import HelpIcon from '@mui/icons-material/Help';
import Floater from './Floater';
import CloseIcon from '@mui/icons-material/Close';
import Slider from '@mui/material/Slider';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import { API_URL } from './constants';
import { ScaleType } from 'recharts/types/util/types';
import html2canvas from 'html2canvas';

interface DataRowGraph {
  allele: string;
  seq_num: number;
  start: number;
  end: number;
  length: number;
  core_peptide: string;
  peptide: string;
  kd: number;
  percentile_rank: number;
  sequence_text: string;
  method: string;
  datasetIndex: number;
  color: string;
}

interface Payload {
  method: string;
  sequence_text: string;
  speciesLocus: string;
  allele: string;
  length: number;
} 

const generateColors = (numColors: number) => {
  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const hue = (i * 360) / numColors;
    colors.push(`hsl(${hue}, 50%, 40%)`);
  }
  return colors;
};


const Results = () => {
  const lineGraphRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { payloads, type } = location.state || {};
  const [dataForGraph, setDataForGraph] = useState<DataRowGraph[][]>([]);
  const [dataForTable, setDataForTable] = useState<any[]>([]);  
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedResultIndices, setSelectedResultIndices] = useState<number[]>(payloads && payloads.length > 0 ? [0] : []);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<Payload | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);
  const [showMore, setShowMore] = useState<boolean[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lineThickness, setLineThickness] = useState(2);
  const [yAxisRange, setYAxisRange] = useState(500);
  const [scaleType, setScaleType] = useState<ScaleType>('linear');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchType, setSearchType] = useState<'peptide' | 'core_peptide'>('peptide');
  const [startRange, setStartRange] = useState<{ start: any; end: any | null }>({ start: null, end: null });
  const [filteredDataForTable, setFilteredDataForTable] = useState<any[]>(dataForTable);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<boolean>(false);
  const [endError, setEndError] = useState<boolean>(false);
  const [tourActive, setTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [kdStart, setKdStart] = useState<string | null>(null);
  const [kdEnd, setKdEnd] = useState<string | null>(null);
  const [kdError, setKdError] = useState<React.ReactNode | null>(null);  const [kdStartError, setKdStartError] = useState<boolean>(false);
  const [kdEndError, setKdEndError] = useState<boolean>(false);
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    if (payloads && payloads.length > 0) {
      const generatedColors = generateColors(payloads.length);
      setColors(generatedColors);
    }
  }, [payloads]);

  const handleResultChange = (event: SelectChangeEvent<number[]>, child: React.ReactNode) => {
    const value = event.target.value as number[];
    if (value.includes(-1)) {
      if (selectedResultIndices.length === payloads.length) {
        setSelectedResultIndices([]);
      } else {
        setSelectedResultIndices(payloads.map((_: Payload, index: number) => index));
      }
    } else {
      setSelectedResultIndices(value);
    }
    setWarningMessage(null);
  };

  const handleShowMore = (payload: Payload, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedPayload(payload);
    setModalOpen(true);
  };

  const toggleShowMore = (index: number) => {
    setShowMore(prev => {
      const newShowMore = [...prev];
      newShowMore[index] = !newShowMore[index];
      return newShowMore;
    });
  }

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPayload(null);
  };

  const handleSaveSearch = async () => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');

    if (!token || !userEmail) {
      navigate('/loginregister');
      return;
    }
    setLoadingSave(true);

    try {
      const response = await axios.post(`${API_URL}/saveSearch`, {
        searchQuery: payloads.map((payload: Payload) => ({
          method: payload.method,
          sequence_text: payload.sequence_text,
          speciesLocus: payload.speciesLocus,
          allele: payload.allele,
          length: payload.length,
        })),
        email: userEmail,
        type: type
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 200) {
        setSaveMessage('Search saved successfully.');
      }
    } catch (error) {
      setWarningMessage('Failed to save search.');
    } finally {
      setLoadingSave(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTotalRequests(payloads.length);
        payloads.forEach((payload: Payload, index: number) => {
          fetch(`${API_URL}/iedb`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              method: payload.method,
              sequence_text: payload.sequence_text,
              speciesLocus: payload.speciesLocus,
              allele: payload.allele,
              length: payload.length.toString(),
              type: type.toString()
            }).toString(),
          })
          .then(async response => {
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText);
            }
            return response.json();
          })
          .then (data => {
            setProgress((prev) => prev + 1);
            setResponses((prevResponses) => {
              const newResponses = [...prevResponses];
              newResponses[index] = data;
              return newResponses;
            });
        })
        .catch(error => {
          setErrorMessage(error.message);
        });
      });
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

    if (payloads && payloads.length > 0) {
      fetchData();
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Your form will be resubmitted.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [payloads, type]);

  const handleCloseError = () => {
    setErrorMessage(null);
  };
  
  const applyFilter = useCallback(() => {
    if (!searchQuery && startRange.start === null && startRange.end === null && kdStart === null && kdEnd === null) {
      setFilteredDataForTable(dataForTable);
      return;
    }  

    const startValue = startRange.start === '' ? null : Number(startRange.start);
    let endValue = startRange.end === '' ? null : Number(startRange.end);
    const kdStartValue = kdStart == null ? null : Number(kdStart);
    const kdEndValue = kdEnd === null || kdEnd === '' ? 20000 : Number(kdEnd);

    if (startRange.start !== null && startRange.start !== 0 && endValue !== 0 && endValue !== null && startRange.start > endValue) {
      setError('Start value must be less than or equal to end value.');
      setStartError(true);
      setEndError(true);
      return;
    }

    if (kdStartValue !== null && kdEndValue !== null && kdStartValue > kdEndValue) {
      setKdError(<Typography variant="body2" component="span">K<sub>d</sub> start value must be less than or equal to K<sub>d</sub> end value.</Typography>);

      return;
    }

    let hasError = false;

    if (isNaN(startValue)) {
      setError('Start value must be a valid number.');
      setStartError(true);
      hasError = true;
    } else if (!hasError) {
      setStartError(false);
    }

    if (isNaN(endValue)) {
      setError('End value must be a valid number.');
      setEndError(true);
      hasError = true;
    } else if (!hasError) {
      setEndError(false);
    }

    if (isNaN(kdStartValue)) {
      setKdError(<Typography variant="body2" component="span">K<sub>d</sub> start value must be a valid number.</Typography>);
      setKdStartError(true);
      hasError = true;
    } else if (!hasError) {
      setKdStartError(false);
    }
    
    if (isNaN(kdEndValue)) {
      setKdError(<Typography variant="body2" component="span">K<sub>d</sub> end value must be a valid number.</Typography>);
      setKdEndError(true);
      hasError = true;
    } else if (!hasError) {
      setKdEndError(false);
    }

    if (startRange.end === null || startRange.end === '' || startRange.end === 0) {
      endValue = Math.max(...dataForTable.map(row => row.start));
    }

    if (endValue !== null && endValue < 1) {
      setError('End value must be greater than zero.');
      setEndError(true);
      hasError = true;
    } else if (!hasError) {
      setEndError(false);
    }

    if (hasError) {
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    const filteredData = dataForTable.filter((row) => {
      const peptideMatch = searchType === 'peptide' && row.peptide.toLowerCase().includes(searchLower);
      const corePeptideMatch = searchType === 'core_peptide' && row.core_peptide.toLowerCase().includes(searchLower);
      const startMatch = endValue !== null
        ? row.start >= startValue && row.start <= endValue
        : row.start >= startValue;
      const kdMatch = kdStartValue !== null && kdEndValue !== null
        ? row.kd >= kdStartValue && row.kd <= kdEndValue
        : kdStartValue !== null
        ? row.kd >= kdStartValue
        : kdEndValue !== null
        ? row.kd <= kdEndValue
        : true;

      const peptideCondition = searchType === 'peptide' ? peptideMatch : true;
      const corePeptideCondition = searchType === 'core_peptide' ? corePeptideMatch : true;
      const startCondition = startRange.start !== null || startRange.end !== null ? startMatch : true;
      const kdCondition = kdStartValue !== null || kdEndValue !== null ? kdMatch : true;

      return peptideCondition && corePeptideCondition && startCondition && kdCondition;
    });
    setFilteredDataForTable(filteredData);
    setSearchModalOpen(false);
    setError(null);
    setKdError(null);
  }, [searchQuery, startRange, kdStart, kdEnd, searchType, dataForTable]);

  useEffect(() => {
    const normalizeData = (data: any, index: number) => {
      return {
        ...data,
        percentile_rank: data.percentile_rank !== undefined ? data.percentile_rank : data.rank,
        datasetIndex: selectedResultIndices[index] + 1,
        color: colors[selectedResultIndices[index]],
      };
    };

    if (responses.length > 0) {
      const selectedData = selectedResultIndices.map((index: number) => responses[index]);
  
      const dataArrays = selectedData.map((selected: any, index: number) => {
        if (selected && typeof selectedData == 'object') {
            const dataArray = Object.values(selected).map((d: any) => ({
            ...d,
            allele: String(d.allele),
            start: Number(d.start),
            length: Number(d.length),
            kd: d.kd === null ? 20000 : Number(d.kd),
            sequence_text: payloads[index].sequence_text,
            method: payloads[index].method,
            datasetIndex: selectedResultIndices[index],
            color: colors[selectedResultIndices[index]],
            })).filter((value, index, self) => 
            index === self.findIndex((t) => (
              t.allele === value.allele && t.start === value.start && t.length === value.length && t.kd === value.kd
            ))
            );
          return dataArray.sort((a: DataRowGraph, b: DataRowGraph) => a.start - b.start);
        }
        return [];
      });
      const normalizedData = dataArrays.map((data: any, index: number) => data.map((d: DataRowGraph) => normalizeData(d, index)));
      setDataForGraph(normalizedData);
  
      const mergedData = dataArrays.flat().map((d: any) => ({
        ...d,
        start: Number(d.start),
        length: Number(d.length),
        kd: Number(d.kd),
        sequence_text: d.sequence_text,
        datasetIndex: d.datasetIndex,
        color: d.color,
      }));
      const filteredDataForTable = mergedData.filter((d: any) => d.kd < 20000);
      setDataForTable(filteredDataForTable.sort((a: any, b: any) => a.kd - b.kd));
      setFilteredDataForTable(filteredDataForTable);

      if (mergedData.length > 0) {
        const headers = Object.keys(mergedData[0]).filter(header => header !== 'color');
        const sequenceTextIndex = headers.indexOf('sequence_text');
        if (sequenceTextIndex > -1) {
          headers.splice(sequenceTextIndex, 1);
          headers.push('sequence_text');
        }
        setCsvHeaders(['datasetIndex', ...headers]);
      }
    }
  }, [selectedResultIndices, responses, payloads, colors]);


  const renderHeader = (header: string) => {
    if (header === 'kd') {
      return (
        <span>
          K<tspan style={{ fontSize: '0.8em', verticalAlign: 'sub' }}>d</tspan>
        </span>
      );
    }
    return header;
  };


  const renderDataSetCell = (datasetIndex: number) => {
    return (
      <TableCell key={`dataset-${datasetIndex}`}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '20px',
              height: '20px',
              backgroundColor: colors[datasetIndex],
              display: 'inline-block',
              marginRight: '8px',
            }}
          />
          {datasetIndex + 1}
        </Box>
      </TableCell>
    );
  };
  
  const handleDownload = () => {
    if (chartContainerRef.current) {
      const containerElement = chartContainerRef.current;
      html2canvas(containerElement, { useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/jpeg');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = 'graph.jpeg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }).catch((error) => {
        console.error('Error capturing the container:', error);
      });
    }
  };

  const handleDownloadCSV = () => {
    const uniqueHeaders = Array.from(new Set(csvHeaders));
  
    const csvRows = [
      uniqueHeaders,
      ...filteredDataForTable.map(row => uniqueHeaders.map(header => header === 'datasetIndex' ? row[header] + 1 : row[header]))
    ];
  
    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  }
  const handleCloseSettings = () => {
    setSettingsOpen(false);
  }

  const handleLineThicknessChange = (event: Event, value: number | number[]) => {
    setLineThickness(value as number);
  }
  const handleYAxisRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setYAxisRange(Number(event.target.value));
  }
  const handleScaleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScaleType(event.target.value as ScaleType);
  }

// eslint-disable-next-line
  const handleStartChange = (value: string) => {
    setStartError(false);
    setStartRange((prev) => ({ ...prev, start: value }));
  };
const handleEndChange = (value: string) => {
  setEndError(false);
  setStartRange((prev) => ({ ...prev, end: value }));
};


  const steps: Step[] = [
    {
      target: '.result-dropdown',
      content: 'Select the result you want to view from this dropdown. You can select multiple results to overlay.',
    },
    {
      target: '.line-graph-container',
      content: 'This is the graph. You can hover for the tooltip, click for more info, or drag to zoom.',
    },
    {
      target: '.bookmark-icon',
      content: 'Click the bookmark to save the result to your account (You must be logged in).',
    },
    {
      target: '.download-icon',
      content: 'Click download to save the graph at its current display.',
    },
    {
      target: '.settings-icon',
      content: 'Click settings to change line thickness, range, or scale.',
    },
    {
      target: '.search-icon',
      content: 'Click the search button to filter CSV data.',
    },
    {
      target: '.clear-filter-icon',
      content: 'Click the "X" to clear the filter.',
    },
    {
      target: '.download-csv-icon',
      content: 'Click the download button to download CSV data in its current form.',
    },
  ];


  return (
    <div>
      <Joyride
      steps={steps.map((step, index) => index === 0 ? { ...step, disableBeacon: true } : step)}
      continuous
      showProgress
      showSkipButton
      run={tourActive}
      stepIndex={stepIndex}
      scrollToFirstStep={false}
      disableScrolling={true}
      spotlightClicks={true}
      spotlightPadding={0}
      styles={{
        beacon: {
        display: 'none',
        },
      }}
      callback={(data) => {
        const { action, index, status, type } = data;
        if (status === 'finished' || status === 'skipped' || action === 'close') {
        setTourActive(false);
        setStepIndex(0);
        } else if (type === 'step:after') {
        if (action === 'next') {
          setStepIndex(index + 1);
        } else if (action === 'prev') {
          setStepIndex(index - 1);
        }
        }
      }}
      />
      <Box
      sx={{
        padding: 2,
        border: '1px solid #ddd',
        borderRadius: 8,
        backgroundColor: '#f7f7f7',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        width: 1000,
        margin: 'auto',
        marginTop: 4,
        position: 'relative'
      }}
    >
    <Typography variant="h4" gutterBottom textAlign={ 'center'}>
      {type === 'mhcii' ? 'MHC-II Results' : 'MHC-I Results'}
    </Typography>
      <Stack spacing={1} sx={{ mt: 2 }}>
        <LinearProgress variant="determinate" value={(progress / totalRequests) * 100} />
            <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
              {`${Math.round((progress / totalRequests) * 100)}%`}
            </div>
      </Stack>

      {warningMessage &&
      <Floater message={warningMessage} type="error" />
      }
      {saveMessage &&
      <Floater message={saveMessage} type="success" />
      }
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
          <Select<number[]>
            multiple
            value={selectedResultIndices}
            onChange={handleResultChange}
            sx={{ width: '100%', maxWidth: 400 }}
            className="result-dropdown"
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                  width: 'auto',
                  whiteSpace: 'normal',
                },
              },
            }}
            renderValue={(selected) => {
              const selectedValues = selected as number[];
              const displayValues = selectedValues.slice(0, 2).map((index) => (
                <Typography key={index} variant="body2" component="div" sx={{ wordBreak: 'break-word', maxWidth: '100%', display: 'block' }}>
                  {index === -1 ? 'Select All' : `Allele: ${payloads[index].allele}, Length: ${payloads[index].length}, Sequence: ${payloads[index].sequence_text.slice(0, 15)}...`}
                </Typography>
              ));
              const moreCount = selectedValues.length - 2;
              return (
                <div>
                  {displayValues}
                  {moreCount > 0 && (
                    <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word', maxWidth: '100%', display: 'block' }}>
                      {`+${moreCount} more`}
                    </Typography>
                  )}
                </div>
              );
            }}
          >
            <MenuItem value={-1}>
              <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word', maxWidth: '100%', display: 'block' }}>
                Select All
              </Typography>
            </MenuItem>
            {payloads.map((payload: any, index: number) => (
              <MenuItem
                key={index}
                value={index}
                style={{ whiteSpace: 'normal', wordBreak: 'break-all', maxWidth: 400, display: 'block' }}
              >
                <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word', maxWidth: '100%', display: 'block' }}>
                  Allele: {payload.allele}
                </Typography>
                <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word', maxWidth: '100%', display: 'block' }}>
                  Length: {payload.length}
                </Typography>
                <Typography variant="body2" component="div" sx={{ wordBreak: 'break-word', maxWidth: '100%', display: 'block' }}>
                  Sequence: {payload.sequence_text.length > 15 ? `${payload.sequence_text.slice(0, 15)}...` : payload.sequence_text}
                  <Button size="small" onClick={(event) => { handleShowMore(payload, event); }}>
                    Show More
                  </Button>
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%', marginTop: 4 }}>
          {!warningMessage && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <div ref={lineGraphRef} className="line-graph-container">
                <LineGraph 
                  dataSets={dataForGraph} 
                  width={900} 
                  height={500} 
                  lineThickness={lineThickness} 
                  yAxisRange={yAxisRange} 
                  scaleType={scaleType} 
                  colors={colors}
                  chartContainerRef={chartContainerRef}
                />
              </div>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 2 }}>
                <IconButton color="primary" onClick={handleSaveSearch} disabled={loadingSave} className="bookmark-icon">
                  {loadingSave ? <CircularProgress size={24} /> : <BookmarkIcon />}
                </IconButton>
                <Box sx={{ height: 8 }} />
                <IconButton color="primary" onClick={handleDownload} className="download-icon">
                  <DownloadIcon />
                </IconButton>
                <Box sx={{ height: 8 }} />
                <IconButton color="primary" onClick={handleOpenSettings} className="settings-icon">
                  <SettingsIcon />
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
    <Box
      sx={{
        padding: 2,
        border: '1px solid #ddd',
        borderRadius: 8,
        backgroundColor: '#f7f7f7',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        width: 1400,
        margin: 'auto',
        marginTop: 4,
        textAlign: 'center',
      }}
      >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <IconButton color="primary" onClick={() => setSearchModalOpen(true)} className="search-icon">
          <SearchIcon />
        </IconButton>
        <IconButton 
          color="primary" 
          onClick={() => {
            setFilteredDataForTable(dataForTable);
            setSearchQuery('');
            setSearchType('peptide');
            setStartRange({ start: null, end: null });
            setKdStart(null);
            setKdEnd(null);
          }}
          className="clear-filter-icon"
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" gutterBottom sx={{ flexGrow: 1, textAlign: 'center', margin: '0 auto' }}>
          CSV Data
        </Typography>
        <IconButton color="primary" onClick={handleDownloadCSV} sx={{ marginLeft: 'auto' }} className="download-csv-icon">
          <DownloadIcon />
        </IconButton>
      </Box>
      

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data Set</TableCell>
              {csvHeaders.filter(header => header !== 'datasetIndex').map((header, index) => (
                <TableCell key={index}>{renderHeader(header)}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDataForTable.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {renderDataSetCell(row.datasetIndex)}
                {csvHeaders.filter(header => header !== 'sequence_text' && header !== 'datasetIndex').map((header, cellIndex) => (
                  <TableCell key={cellIndex}>{row[header]}</TableCell>
                ))}
                <TableCell>
                  <Typography sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {showMore[rowIndex] ? row.sequence_text : `${row.sequence_text.slice(0, 9)}...`}
                  </Typography>
                  <Button size="small" onClick={() => toggleShowMore(rowIndex)}>
                    {showMore[rowIndex] ? 'Show Less' : 'Show More'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      </Box>
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography variant="h6" component="h2">
            Payload Information
          </Typography>
          {selectedPayload && (
            <Box mt={2}>
          <Typography variant="body2">Method: <span style={{ color: '#555' }}>{selectedPayload.method}</span></Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
            Sequence: <span style={{ color: '#555' }}>{selectedPayload.sequence_text}</span>
          </Typography>
          <Typography variant="body2">Allele: <span style={{ color: '#555' }}>{selectedPayload.allele}</span></Typography>
          <Typography variant="body2">Length: <span style={{ color: '#555' }}>{selectedPayload.length}</span></Typography>
            </Box>
          )}
          <Button onClick={handleCloseModal} sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Modal>

      <Modal open={!!errorMessage} onClose={handleCloseError}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            border: '2px solid #f44336', // red border
            boxShadow: 24,
            p: 4,
            backgroundColor: '#ffffff', // white background color
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseError}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Typography component="h2" sx={{ fontSize: '2rem', fontWeight: 'bold', mb: 2 }}>
          Unexpected Error
          </Typography>
          <Typography sx={{ mt: 2, color: '#f44336' }}>
            {errorMessage}
          </Typography>
        </Box>
      </Modal>

      <Modal open={settingsOpen} onClose={handleCloseSettings}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography variant="h6" component="h2">
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
              <FormLabel component="legend">Y Axis Range</FormLabel>
              <RadioGroup
                value={yAxisRange}
                onChange={handleYAxisRangeChange}
              >
                <FormControlLabel value={500} control={<Radio />} label="500" />
                <FormControlLabel value={5000} control={<Radio />} label="5000" />
                <FormControlLabel value={20000} control={<Radio />} label="20000" />
              </RadioGroup>
            </FormControl>
            <Typography variant="body2" sx={{ mt: 2 }}>Scale Type</Typography>
            <RadioGroup
              value={scaleType}
              onChange={handleScaleTypeChange}
              >
              <FormControlLabel value="linear" control={<Radio />} label="Linear" />
              <FormControlLabel value="log" control={<Radio />} label="Logarithmic" />
            </RadioGroup>
          </Box>
          <Button onClick={handleCloseSettings} sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Modal>
      <Modal open={searchModalOpen} onClose={() => setSearchModalOpen(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              applyFilter();
              setSearchModalOpen(false);
              e.preventDefault();
            }
          }}
        >
          {error && (
            <Floater message={error} type="error" />
          )}
          {kdError && (
            <Floater message={kdError} type="error" />
          )}
          <Typography variant="h6" component="h2">
            Advanced Search
          </Typography>
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <FormLabel component="legend">Search Type</FormLabel>
            <RadioGroup
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'peptide' | 'core_peptide')}
            >
              <FormControlLabel value="peptide" control={<Radio />} label="Peptide" />
              <FormControlLabel value="core_peptide" control={<Radio />} label="Core Peptide" />
            </RadioGroup>
          </FormControl>
          <TextField
            label="Search"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: '100%', mt: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <FormLabel component="legend">Peptide Position</FormLabel>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Minimum"
              variant="outlined"
              value={startRange.start}
              onChange={(e) => handleStartChange(e.target.value)}
              onFocus={(e) => {
                if (e.target.value === '0') {
                  setStartRange((prev) => ({ ...prev, start: '' }));
                }
              }}
              sx={{ width: '100%', borderColor: startError ? 'red' : 'inherit' }}
              error={startError}
            />
            <TextField
              label="Maximum"
              variant="outlined"
              value={startRange.end ?? ''}
              onChange={(e) => handleEndChange(e.target.value)}
              onFocus={(e) => {
                if (e.target.value === '0') {
                  setStartRange((prev) => ({ ...prev, end: '' }));
                }
              }}
              sx={{ width: '100%', borderColor: endError ? 'red' : 'inherit' }}
              error={endError}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <FormLabel component="legend">k<sub>d</sub> Range</FormLabel>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Minimum"
              variant="outlined"
              value={kdStart ?? ''}
              onChange={(e) => setKdStart(e.target.value)}
              sx={{ width: '100%', borderColor: kdStartError ? 'red' : 'inherit' }}
              error={kdStartError}
            />
            <TextField
              label="Maximum"
              variant="outlined"
              value={kdEnd ?? ''}
              onChange={(e) => setKdEnd(e.target.value)}
              sx={{ width: '100%', borderColor: kdEndError ? 'red' : 'inherit' }}
              error={kdEndError}
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
      onClick={() => {setTourActive(true); setStepIndex(0);}}
      sx={{ position: 'fixed', bottom: 16, right: 16 }}>
        <HelpIcon />
      </IconButton>
  </div>
  );
};

export default Results;