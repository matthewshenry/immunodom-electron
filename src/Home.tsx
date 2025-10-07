import * as React from 'react';
import Joyride, { Step }  from 'react-joyride';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Box from '@mui/joy/Box';
import { Typography } from '@mui/joy';
import { MenuItem, Select, SelectChangeEvent, TextareaAutosize, CircularProgress, Modal, IconButton, Autocomplete, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import HelpIcon from '@mui/icons-material/Help';
import { API_URL } from './constants';
import { bridgeFetch } from "./api";

function alleleJsonFilename(type:string, uiMethod:string):string{
  const safe = uiMethod.replace(/\s+/g, "_");
  return `${safe}_${type}.json`;
}

const alleleJsonModules = import.meta.glob<Record<string,string[]>>(
  "./alleles/*.json",
  { eager: true, import: "default" }
);

  const CenteredGridRow = ({ children }: { children: React.ReactNode }) => (
    <Box display="flex" justifyContent="center" flexWrap="wrap">
      {children}
    </Box>
  );

  
  interface DigitButtonProps {
    digit: number;
    selectedDigits: number[];
    setSelectedDigits: (digits: number[]) => void;
  }
  
  const DigitButton: React.FC<DigitButtonProps> = ({ digit, selectedDigits, setSelectedDigits }) => {
    const isSelected = selectedDigits.includes(digit);
  
    const handleClick = () => {
      if (isSelected) {
        setSelectedDigits(selectedDigits.filter((d) => d !== digit));
      } else {
        setSelectedDigits([...selectedDigits, digit]);
      }
    };
    return (
      <Box
        onClick={handleClick}
        style={{
          backgroundColor: isSelected ? '#CCCCCC' : '#fff', // Change background color based on selection
          padding: 10,
          margin: 5,
          cursor: 'pointer',
        }}
      >
        {digit}
      </Box>
    );
  };

export default function Home() {
  const { type } = useParams<{ type: string }>();
  const [speciesLocusToMhcAlleles, setSpeciesLocusToMhcAlleles] = useState<{ [key: string]: string[] }>({});
  const [selectedSpeciesLocus, setSelectedSpeciesLocus] = useState<string[]>([]);
  const [mhcAlleles, setMhcAlleles] = useState<string[]>([]);
  const [selectedMhcAlleles, setSelectedMhcAlleles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false); 
  const [selectedMethod, setSelectedMethod] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAlive, setIsAlive] = useState<boolean | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(1);

  const mhciiMethods = [
    { value: "netmhciipan_el", label: "NetMHCIIpan 4.1 EL (Recommended Epitope Predictor)" },
    { value: "netmhciipan_ba", label: "NetMHCIIpan 4.1 BA (Recommended Binding Predictor)" },
    { value: "recommended", label: "IEDB Recommended Predictor" },
    { value: "Consensus", label: "Consensus 2.22" },
    { value: "NN_align", label: "NN_align 2.3 (NetMHCII 2.3)" },
    { value: "smm_align", label: "SMM_align (NetMHCII 1.1)" },
    { value: "comblib", label: "Combinatorial library" }
  ];

  const mhciMethods = [
    { value: "netmhcpan_el-4.1", label: "NetMHCpan 4.1 EL (Recommended Epitope Predictor)" },
    { value: "netmhcpan_ba-4.1", label: "NetMHCpan 4.1 BA (Recommended Binding Predictor)" },
    { value: "recommended", label: "IEDB Recommended Predictor" },
    { value: "ann", label: "Artificial Neural Network (ANN)" },
    { value: "smmpmbec", label: "SMM-PMBEC" },
    { value: "smm", label: "SMM" },
    { value: "comblib_sidney2008", label: "Combinatorial Library (Sidney 2008)" },
    { value: "netmhccons", label: "NetMHCcons" },
    { value: "pickpocket", label: "PickPocket" }
  ];

  const handleMethodChange = (event: SelectChangeEvent<string>) => {
    setSelectedMethod(event.target.value);
  };

  useEffect(() => {
    // Reset UI whenever the page type or method changes
    setSelectedSpeciesLocus([]);
    setMhcAlleles([]);
    setSelectedMhcAlleles([]);
    setErrorMessage(null);

    const loadAlleleBucketsFromLocalJson = async () => {
      try {
        if(!type) return;
        setLoading(true);

        // Use current UI method, or fallback default per type
        const uiMethod =
          selectedMethod ||
          (type === "mhci" ? "netmhcpan_el-4.1" : "netmhciipan_el");

        // Resolve filename and a map key that matches import.meta.glob output
        const filename = alleleJsonFilename(type, uiMethod);
        const mapKey = `./alleles/${filename}`;

        // Pull the pre-bundled JSON from the glob map
        const data = alleleJsonModules[mapKey];

        if(!data){
          // Helpful error that lists what we actually have in /src/alleles
          const available = Object.keys(alleleJsonModules).sort().join("\n  - ");
          throw new Error(
            `Missing allele JSON: ${mapKey}\nMake sure this file exists in src/alleles/.\nAvailable files:\n  - ${available}`
          );
        }

        // data is already the bucketed form {human:[...], cow:[...], ...}
        setSpeciesLocusToMhcAlleles(data);

        // Pick a default species/locus that has entries
        const firstNonEmpty =
          Object.entries(data).find(([, arr]) => (arr?.length || 0) > 0)?.[0] ||
          Object.keys(data)[0] ||
          "human";

        setSelectedSpeciesLocus([firstNonEmpty]);
        setMhcAlleles(data[firstNonEmpty] || []);
      } catch(err:any){
        setErrorMessage(
          `Failed to load local allele definitions for ${type}/${selectedMethod || "(default)"} — ${err?.message || err}`
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAlleleBucketsFromLocalJson();
  }, [type, selectedMethod]); // IMPORTANT: re-run when method changes



  const navigate = useNavigate();

  const handleSpeciesLocusChange = (event: SelectChangeEvent<string[]>) => {
    const selectedValues = event.target.value as string[];
    setSelectedSpeciesLocus(selectedValues);
    const newMhcAlleles = selectedValues.flatMap(speciesLocus => speciesLocusToMhcAlleles[speciesLocus] || []);
    setMhcAlleles(newMhcAlleles);
    setSelectedMhcAlleles([]);
  };
  
  const [selectedDigits, setSelectedDigits] = useState([]);
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const formJson = Object.fromEntries((formData as any).entries());

      // 1) Gather sequences, one per line
      const proteinSequences: string[] = (formJson.proteinSequence || "")
        .toString()
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      if (proteinSequences.length === 0) {
        throw new Error("Please enter at least one protein sequence.");
      }

      // 2) Map your UI method values to IEDB method strings
      const mapMethod = (toolType: string, uiMethod: string): string | null => {
        if (toolType === "mhci") {
          if (uiMethod === "netmhcpan_el-4.1") return "netmhcpan_el";
          if (uiMethod === "netmhcpan_ba-4.1") return "netmhcpan_ba";
          return null;
        } else {
          // mhcii
          if (uiMethod === "netmhciipan_el") return "netmhciipan_el";
          if (uiMethod === "netmhciipan_ba") return "netmhciipan_ba";
          // Add more
          return null;
        }
      };

      const toolGroup = (type === "mhcii") ? "mhcii" : "mhci";
      const ngMethod = mapMethod(toolGroup, (formJson.predictionMethod || "").toString());
      if (!ngMethod) {
        throw new Error(
          `The selected method "${formJson.predictionMethod}" isn’t available in the Next-Gen API. Choose a NetMHCpan (MHCI) or NetMHCIIpan (MHCII) method.`
        );
      }

      // 3) Alleles: NG Tools expects a comma-separated string (not array)
      //    https://nextgen-tools.iedb.org/docs/api/endpoints/api_references.html
      const alleleCsv = (selectedMhcAlleles || []).join(",");
      if (!alleleCsv) {
        throw new Error("Please select or enter at least one MHC allele.");
      }

      // 4) Peptide length range: NG Tools uses [min, max] (not a list)
      //    convert selectedDigits[] to [min, max]
      if (!Array.isArray(selectedDigits) || selectedDigits.length === 0) {
        throw new Error("Please select at least one peptide length.");
      }
      const minLen = Math.min(...selectedDigits as number[]);
      const maxLen = Math.max(...selectedDigits as number[]);

      // 5) Build input_sequence_text (FASTA headers optional; plain lines are fine)
      //    https://nextgen-tools.iedb.org/docs/api/endpoints/api_references.html
      const input_sequence_text = proteinSequences.join("\n");

      // 6) Construct the pipeline payload per NG IEDB
      const pipelineBody = {
        pipeline_title: "",
        run_stage_range: [1, 1],
        stages: [
          {
            stage_number: 1,
            tool_group: toolGroup, // "mhci" or "mhcii"
            input_sequence_text,
            input_parameters: {
              alleles: alleleCsv,
              peptide_length_range: [minLen, maxLen],
              predictors: [
                {
                  type: "binding",
                  method: ngMethod,
                },
              ],
            },
          },
        ],
      };
      // log what we're sending to iedb
      console.log("Submitting to IEDB pipeline:", {
        url: `${API_URL}/pipeline`,
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: pipelineBody,
      });
      const { ok, status, statusText, data } = await bridgeFetch<any>(`${API_URL}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(pipelineBody),
      });
      if (!ok) throw new Error(`Pipeline request failed (${status}): ${statusText}`);

      if (!data?.results_uri && !data?.result_id) {
        throw new Error("Pipeline submitted but no results handle was returned.");
      }
      navigate("/results", { state: { type, result_id: data.result_id, results_uri: data.results_uri } });

    } catch (e: any) {
      setErrorMessage(e.message || "Unexpected error during submission.");
      setIsAlive(false); // legacy, may need fix
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseError = () => {
    setErrorMessage(null);
  };

  const steps: Step[] = [
    {
      target: '.protein-sequence-container',
      content: 'Enter protein sequence(s) here, one per line.',
    },
    {
      target: '.prediction-method-container',
      content: 'Select the prediction method you would like to use. This will impact the species/locus and MHC alleles available to you.',
    },
    {
      target: '.species-locus-container',
      content: 'Select the species/locus you would like to use. This will impact the MHC alleles available to you.',
    },
    {
      target: '.mhc-alleles-container',
      content: 'Select the MHC alleles you would like to use. Begin typing to filter the list or scroll. You can select multiple alleles. Click on an allele to remove, or click the "x" to clear all.',
    },
    {
      target: '.length-container',
      content: 'Select the length(s) you would like to use. You can select multiple lengths. Click on a length to remove.',
    },
    {
      target: '[type="submit"]',
      content: 'Click here to submit your request.',
    }
  ];

  return (
    <div key={type} className="form-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      paddingTop: '20px',
    }}>
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
        component="section"
        sx={{
          padding: 2,
          border: '1px solid #ddd',
          borderRadius: 8,
          backgroundColor: '#f7f7f7',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: 600,
        }}
      >
      <h2>{type === 'mhcii' ? 'MHC-II Binding Predictions' : 'MHC-I Binding Predictions'}</h2>
      <form

           onSubmit={handleSubmit}>

        <Stack spacing={1}>
          <Stack spacing={0.5}>
          <div className="protein-sequence-container">
          <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Enter protein sequence(s), one per line
          </Typography>
          <TextareaAutosize
          placeholder="Protein Sequence"
          minRows={4} 
          maxRows={8} 
          style={{ width: '100%' }}
          name="proteinSequence"
          />
          </div>
        </Stack>
        <Stack spacing={0.5}>
        <div className="prediction-method-container">
        <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Prediction Method</Typography>
          <Select
          value={selectedMethod}
          onChange={handleMethodChange}
          sx={{
          height: 40,
          width: '100%', // Add this line to ensure the Select component takes the full width
          }}
          name="predictionMethod"
          >
          {type === 'mhcii' ? mhciiMethods.map(method => (
          <MenuItem key={method.value} value={method.value}>
          {method.label}
          </MenuItem>
          )) : mhciMethods.map(method => (
          <MenuItem key={method.value} value={method.value}>
          {method.label}
          </MenuItem>
          ))}
          </Select>
        </div>
        </Stack>

        <Stack spacing={0.5}>
        <div className="species-locus-container">
        <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Select Species/Locus
          </Typography>
          {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Select
          multiple
          value={selectedSpeciesLocus}
          onChange={handleSpeciesLocusChange}
          label="Select Species/Locus"
          sx={{ height: 40, width: '100%' }}
          name="speciesLocus"
          >
          {Object.keys(speciesLocusToMhcAlleles).map((speciesLocus) => (
          <MenuItem key={speciesLocus} value={speciesLocus}>
          {speciesLocus}
          </MenuItem>
          ))}
          </Select>    
        )}
        </div>        
        </Stack>

        <Stack spacing={0.5}>
        <div className="mhc-alleles-container">
        <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Select MHC allele(s)</Typography>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Autocomplete
          multiple
          disableCloseOnSelect
          freeSolo
          value={selectedMhcAlleles}
          options={mhcAlleles}
          onChange={(event, newValue) => {
            setSelectedMhcAlleles(newValue as string[]);
          }}
          renderInput={(params) => (
            <TextField
            {...params}
            variant="outlined"
            placeholder="Type to filter..."
            className = "mhc-alleles-autocomplete"
            />
          )}
          />
        )}
        </div>
        </Stack>

        <Stack> 
        <div className="length-container">
        <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Select Length
        </Typography>
        {type === 'mhcii' ? (
        <Box display="grid" gridTemplateColumns="repeat(1, 1fr)" justifyContent="center" component="div" className='digit-button-container'>
        <CenteredGridRow>
          {Array.from({ length: 10 }, (_, i) => i + 11).map((digit) => (
          <DigitButton
            key={digit}
            digit={digit}
            selectedDigits={selectedDigits}
            setSelectedDigits={setSelectedDigits}
          />
          ))}
        </CenteredGridRow>
        <CenteredGridRow>
          {Array.from({ length: 10 }, (_, i) => i + 21).map((digit) => (
          <DigitButton
            key={digit}
            digit={digit}
            selectedDigits={selectedDigits}
            setSelectedDigits={setSelectedDigits}
          />
          ))}
        </CenteredGridRow>
        </Box>
        ) : (
        selectedMethod === "comblib_sidney2008" ? (
          <CenteredGridRow>
          <DigitButton
            key={9}
            digit={9}
            selectedDigits={selectedDigits}
            setSelectedDigits={setSelectedDigits}
          />
          </CenteredGridRow>
        ) : (
          <CenteredGridRow>
          {Array.from({ length: 7 }, (_, i) => i + 8).map((digit) => (
            <DigitButton
            key={digit}
            digit={digit}
            selectedDigits={selectedDigits}
            setSelectedDigits={setSelectedDigits}
            />
          ))}
          </CenteredGridRow>
        ))}
        
        {/* Hidden input field to hold the selected digits */}
        <input
          type="hidden"
          name="selectedLengths"
          value={selectedDigits.join(',')}
        />
        </div>
        </Stack>


              <Stack>
                {formLoading ? (
                  <Button variant="solid" color="primary" disabled>
                    <CircularProgress size={24} />
                    Loading...
                  </Button>
                ) : (
                  <Button type="submit">Submit</Button>
                )}
              </Stack>
            </Stack>
        </form>
      </Box>
      <Box sx={{ my: 2 }} /> 
      <Box
        sx={{
          padding: 2,
          border: '1px solid #ddd',
          borderRadius: 8,
          backgroundColor: '#f7f7f7',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          width: 600,
          textAlign: 'center',
        }}
      >
        <Typography component="p" sx={{ fontSize: 12, fontStyle: 'italic' }}>
          This application is currently in beta. For any errors or suggestions, please contact TMcMullen1@UFL.edu. This project is supported and sponsored by David Ostrov of the University of Florida, Department of Pathology, Immunology, and Laboratory Medicine. Created by Thomas McMullen and Andrew Jackson as part of our undergraduate senior project.
        </Typography>
        <Typography component="p" sx={{ mt: 2, fontSize: 12, fontStyle: 'italic' }}>
          We gratefully acknowledge the use of IEDB tools. If you include these predictions in a manuscript, please cite the following in the methods section:
        </Typography>
        <Typography component="p" sx={{ mt: 2, fontSize: 12, fontStyle: 'italic' }}>
          Kaabinejadian S, Barra C, Alvarez B, Yari H, Hildebrand WH, Nielsen M. 2022. Accurate MHC Motif Deconvolution of Immunopeptidomics Data Reveals a Significant Contribution of DRB3, 4 and 5 to the Total DR Immunopeptidome. Front Immunol. 13:835454. doi: 10.3389/fimmu.2022.835454.
        </Typography>
      </Box>

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
          {isAlive !== null && (
            <Typography sx={{ mt: 2, color: isAlive ? 'green' : 'red' }}>
              {isAlive ? 'The app is alive.' : 'The app is not alive.'}
            </Typography>
          )}
        </Box>
      </Modal>
      <IconButton
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
      }}
      className="help-icon" 
      color="primary" 
      onClick={() => 
        {
          setTourActive(true); 
          setStepIndex(0);
        }
      }
      >
      <HelpIcon />
      </IconButton>

    </div>
  );
}