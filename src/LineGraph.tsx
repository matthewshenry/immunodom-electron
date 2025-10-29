import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Label, ReferenceLine, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts';
import { Modal, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ScaleType } from 'recharts/types/util/types';

interface DataRow {
  allele: string;
  seq_num: number;
  start: number;
  end: number;
  length: number;
  core_peptide: string;
  peptide: string;
  kd: number | null;
  percentile_rank: number;
  sequence_text: string;
  method: string;
  datasetIndex: number;
  color: string;
}

interface LineGraphProps {
  dataSets: DataRow[][];
  width: number;
  height: number;
  lineThickness: number;
  yAxisRange: number;
  scaleType: ScaleType | Function;
  colors: string[];
  chartContainerRef: React.RefObject<HTMLDivElement>;
}

const preprocessData = (dataSets: DataRow[][], gapThreshold: number) => {
  return dataSets.map(dataSet => {
    const processedData: DataRow[] = [];

    // Always add 20000 before the first value
    if (dataSet.length > 0) {
      processedData.push({
        ...dataSet[0],
        kd: 20000,
        start: dataSet[0].start - 1, // Adjust the start to be one less than the first value
        color: dataSet[0].color,
      });
    }

    for (let i = 0; i < dataSet.length; i++) {
      processedData.push(dataSet[i]);
      if (i < dataSet.length - 1 && dataSet[i + 1].start - dataSet[i].start > gapThreshold) {
        processedData.push({
          ...dataSet[i],
          start: dataSet[i].start + 1,
          kd: 20000, // Insert a value of 20000 to indicate the start of the gap
          color: dataSet[i].color,
        });
        for (let j = dataSet[i].start + 2; j < dataSet[i + 1].start; j++) {
          processedData.push({
            ...dataSet[i],
            start: j,
            kd: null, // Insert a null value to create a gap
            color: dataSet[i].color,
          });
        }
        processedData.push({
          ...dataSet[i],
          start: dataSet[i + 1].start - 1,
          kd: 20000, // Insert a value of 20000 to indicate the end of the gap
          color: dataSet[i].color,
        });
      }
    }

    // Always add 20000 after the last value
    if (dataSet.length > 0) {
      processedData.push({
        ...dataSet[dataSet.length - 1],
        kd: 20000,
        start: dataSet[dataSet.length - 1].start + 1, // Adjust the start to be one more than the last value
        color: dataSet[dataSet.length - 1].color,
      });
    }

    return processedData;
  });
};

const LineGraph: React.FC<LineGraphProps> = ({ dataSets, width, height, lineThickness, yAxisRange, scaleType, colors, chartContainerRef }) => {
  const [popupData, setPopupData] = useState<DataRow[] | null>(null);
  const [showMore, setShowMore] = useState<boolean[]>([]);
  const [refAreaLeft, setRefAreaLeft] = useState<number | string>('');
  const [refAreaRight, setRefAreaRight] = useState<number | string>('');
  const [left, setLeft] = useState<string | number>('dataMin');
  const [right, setRight] = useState<string | number>('dataMax');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(true);
  const [minValue, setMinValue] = useState<number | string>('dataMin');
  const [maxValue, setMaxValue] = useState<number | string>('dataMax');

  useEffect(() => {
    if (dataSets.length > 0) {
      const allData = dataSets.flat();
      const minStart = Math.min(...allData.map(d => d.start));
      const maxStart = Math.max(...allData.map(d => d.start));
      setMinValue(minStart);
      setMaxValue(maxStart);
      setLeft(minStart);
      setRight(maxStart);
    }
  }, [dataSets]);
  
  const handleZoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '' || refAreaLeft === undefined || refAreaRight === undefined) {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }
  
    let left = refAreaLeft;
    let right = refAreaRight;
  
    if (left > right) [left, right] = [right, left];
  
    setLeft(left);
    setRight(right);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const handleZoomOut = () => {
    setLeft(minValue);
    setRight(maxValue);
  };

  const toggleShowMore = (index: number) => {
    setShowMore(prev => {
      const newShowMore = [...prev];
      newShowMore[index] = !newShowMore[index];
      return newShowMore;
    });
  };

  const handlePointClick = (data: DataRow[], colorIndex: number) => {
    const dataWithIndex = data.map(d => ({ ...d, datasetIndex: colorIndex + 1 }));
    setPopupData(dataWithIndex);
  };

  const handleClose = () => {
    setPopupData(null);
  }

  const handleMouseDown = (e: any) => {
    setRefAreaLeft(e.activeLabel);
    setIsDragging(false);
    setTooltipVisible(false); 
  };

  const handleMouseUp = () => {
    if (isDragging) {
      if (refAreaLeft > refAreaRight) {
        const temp = refAreaLeft;
        setRefAreaLeft(refAreaRight);
        setRefAreaRight(temp);
      }
      handleZoom();
    }
    setTimeout(() => {
      setIsDragging(false);
      setTooltipVisible(true); 
    }, 100);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const refAreaRightRef = useRef('');

  const handleMouseMoveWithDrag = (e: any) => {
    if (refAreaLeft) {
      //setRefAreaRight(e.activeLabel);
      refAreaRightRef.current = e.activeLabel;
      setIsDragging(true);
    }
  };

  const handleClick = (e: any) => {
    if (!isDragging && e && e.activeLabel) {
      const clickedData = dataSets.map(data => data.find(d => d.start === e.activeLabel)).filter(d => d !== undefined) as DataRow[];
      if (clickedData.length > 0) {
        setPopupData(clickedData);
      }
    }
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload, datasetIndex, dataIndex, handlePointClick } = props;
    return (
      <circle
        key={`dot-${datasetIndex}-${dataIndex}`}
        cx={cx}
        cy={cy}
        r={3}
        fill="black"
        stroke="white"
        strokeWidth={1}
        onClick={() => handlePointClick(payload, datasetIndex)}
      />
    );
  };

  const CustomTooltip: React.FC<{ active?: boolean, payload?: any[], label?: string }> = ({ active, label }) => {
    if (active && label) {
      return (
        <div style={{ position: 'absolute', left: `${label}px`, top: 0, bottom: 0, width: '2px', backgroundColor: 'red' }} />
      );
    }
    return null;
  };

  const CustomYAxisLabel = ({ viewBox }: { viewBox?: any }) => {
    const { x, y, width, height } = viewBox;
    const cx = x + width / 2 - 20;
    const cy = y + height / 2;
    return (
      <text x={cx} y={cy} transform={`rotate(-90, ${cx}, ${cy})`} textAnchor="middle" fill="#666">
        K<tspan baselineShift="sub">d</tspan> (nM)
      </text>
    );
  };

  // Custom Legend Logic
  const legendData = dataSets.map((dataSet, index) => ({
    allele: dataSet[0]?.allele,
    length: dataSet[0]?.length,
    color: colors[dataSet[0]?.datasetIndex -1],
    index: dataSet[0]?.datasetIndex,
  }));

  const processedDataSets = preprocessData(dataSets, 1); // Adjust gapThreshold as needed

  return (
    <div style={{ width: '100%', height: '100%', userSelect: 'none' }}>
      <Button onClick={handleZoomOut}>Zoom Out</Button>
      <div ref={chartContainerRef}>
        <ResponsiveContainer>
          <div>
            <LineChart
              width={width}
              height={height}
              margin={{ top: 20, right: 30, bottom: 50, left: 20 }} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMoveWithDrag}
              onMouseUp={handleMouseUp}
              onClick={handleClick}
            >
              {processedDataSets.map((data, datasetIndex) => (
                <Line
                  key={`line-${datasetIndex}`} 
                  type="monotone"
                  dataKey="kd"
                  data={data}
                  stroke={data[0]?.color}
                  strokeWidth={lineThickness}
                  dot={<CustomDot handlePointClick={handlePointClick} datasetIndex={datasetIndex} />}
                  activeDot={false}
                  connectNulls={false}
                />
              ))}
              {tooltipVisible && <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'red', strokeWidth: lineThickness }}/>}
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis
                key={`x-axis-${left}-${right}`}
                allowDataOverflow 
                dataKey="start" 
                domain={[left, right]} 
                type="number" 
                tickFormatter={(tick) => tick.toLocaleString()} 
                tickCount={Math.min(Number(right) - Number(left), 30)}
              >
                <Label value="Peptide Position" position="insideBottom" offset={-5} />
              </XAxis>
              <YAxis
                key={`y-axis-${yAxisRange}-${scaleType}`}
                type="number"
                domain={scaleType === 'log' ? [yAxisRange, 1] : [yAxisRange, 0]}
                allowDataOverflow={true}
                scale={scaleType as ScaleType}
              >
                <Label content={<CustomYAxisLabel />} position="insideLeft" />
              </YAxis>
              <ReferenceLine y={50} stroke="red" strokeDasharray="5 5" />
              {refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} />
              ) : null}
            </LineChart>
          </div>
        </ResponsiveContainer>
      </div>

      <Modal open={popupData !== null} onClose={handleClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40%',
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 4,
            overflowY: 'auto',
            maxHeight: '80%',
          }}
        >
          {popupData && (
            <>
              <IconButton
                aria-label="close"
                onClick={handleClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                }}
              >
                <CloseIcon />
              </IconButton>

              <Typography variant="h6" gutterBottom>
                Data Point Information
              </Typography>
              {popupData
                .filter(data => data.kd <= yAxisRange)
                .map((data, index) => ({ ...data, originalIndex: index }))
                .sort((a, b) => a.kd - b.kd)
                .map((data, index) => (
                  <Box key={index} sx={{ mt: 2 }}>
                    <Typography sx={{ color: data.color }}>
                      <strong>Dataset Index:</strong> {data.datasetIndex}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>Allele:</strong> {data.allele}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>Method:</strong> {data.method}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: data.color, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      <Typography component="span">
                        <strong>Sequence:</strong> {showMore[index] ? data.sequence_text : `${data.sequence_text.slice(0, 15)}...`}
                        <Button size="small" onClick={() => toggleShowMore(index)}>
                          {showMore[index] ? 'Show Less' : 'Show More'}
                        </Button>
                      </Typography>
                    </Box>
                    <Typography sx={{ color: data.color }}>
                      <strong>Start:</strong> {data.start}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>End:</strong> {data.end}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>Length:</strong> {data.length}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>Core Peptide:</strong> {data.core_peptide}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>Peptide:</strong> {data.peptide}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>kd:</strong> {data.kd}
                    </Typography>
                    <Typography sx={{ color: data.color }}>
                      <strong>Rank:</strong> {data.percentile_rank}
                    </Typography>
                  </Box>
                ))}
            </>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default LineGraph;