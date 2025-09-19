import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, List, ListItem, ListItemText, Button, ListItemButton, Modal, IconButton, TextField, Select, MenuItem, CircularProgress, Stack, TextareaAutosize, SelectChangeEvent, Autocomplete, Popover } from '@mui/material';
import axios from 'axios';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { API_URL } from './constants';

interface Search {
  id: string;
  searchQuery: any[];
  userId: string;
  type: string;
}

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

const SavedSearches = () => {
  const navigate = useNavigate();
  const [savedSearches, setSavedSearches] = useState<Search[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<Search | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [speciesLocusToMhcAlleles, setSpeciesLocusToMhcAlleles] = useState<{ [key: string]: string[] }>({});
  const [selectedSpeciesLocus, setSelectedSpeciesLocus] = useState<string[]>([]);
  const [mhcAlleles, setMhcAlleles] = useState<string[]>([]);
  const [selectedMhcAlleles, setSelectedMhcAlleles] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('netmhciipan_el');
  const [selectedDigits, setSelectedDigits] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState<boolean[]>(Array(savedSearches.length).fill(false));
  const [selectedType, setSelectedType] = useState<'MHC-I' | 'MHC-II'>('MHC-II');

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

  const getMethodLabel = (methodValue: string, type: 'MHC-I' | 'MHC-II'): string => {
    const methods = type === 'MHC-II' ? mhciiMethods : mhciMethods;
    const method = methods.find(m => m.value === methodValue);
    return method ? method.label : methodValue;
  };

  const toggleShowMore = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowMore(prev => {
      const newShowMore = [...prev];
      newShowMore[index] = !newShowMore[index];
      return newShowMore;
    });
  };

  const handleClose = () => {
    setOpen(false);
    setModalContent('');
  };

  const handleEditOpen = async (search: Search) => {
    const updatedType = reverseTypeMapping[search.type];
    await setSelectedType(updatedType);
    await setSelectedSearch(search);
    await setSelectedMethod(search.searchQuery[0].method);
    await fetchSpeciesLocusToMhcAlleles(typeMapping[updatedType], search.searchQuery[0].method);
  
    const uniqueAlleles = search.searchQuery.reduce((acc: string[], query: any) => {
      if (!acc.includes(query.allele)) {
        acc.push(query.allele);
      }
      return acc;
    }, []);
    
    setSelectedMhcAlleles(uniqueAlleles);    
    const lengths = search.searchQuery.map((query: any) => Number(query.length));
    
    setSelectedDigits(lengths);
    const uniqueSequences = search.searchQuery.reduce((acc: string[], query: any) => {
      if (!acc.includes(query.sequence_text)) {
        acc.push(query.sequence_text);
      }
      return acc;
    }, []);
    const jsonCompatibleContent = JSON.stringify(uniqueSequences, null, 2);
    setModalContent(jsonCompatibleContent);
  
    const selectedLocus = search.searchQuery[0].speciesLocus;
    setSelectedSpeciesLocus(Array.isArray(selectedLocus) ? selectedLocus : selectedLocus.split(','));
  
    await setEditOpen(true);
  };


  useEffect(() => {
    if (Array.isArray(selectedSpeciesLocus) && selectedSpeciesLocus.length > 0) {
      const alleles = selectedSpeciesLocus.flatMap(locus => speciesLocusToMhcAlleles[locus] || []);
      setMhcAlleles(alleles);
    }
  }, [speciesLocusToMhcAlleles, selectedSpeciesLocus]);

  const handleEditClose = () => {
    setEditOpen(false);
    setSelectedSearch(null);
  };

  const handleDelete = async (searchId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/deleteSavedSearch/${searchId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSavedSearches(savedSearches.filter(search => search.id !== searchId));
      handlePopoverClose();
    } catch (error) {
      setWarningMessage('Failed to delete saved search.');
    }
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, searchId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedDeleteId(searchId);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedDeleteId(null);
  };

  useEffect(() => {
    const fetchSavedSearches = async () => {
      const token = localStorage.getItem('token');
      const userEmail = localStorage.getItem('userEmail');
      if (!token || !userEmail) {
        navigate('/loginregister');
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/getSavedSearches`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            email: userEmail
          }
        });

        if (response.status === 200) {
          setSavedSearches(response.data as Search[]);
        }
      } catch (error) {
        setErrorMessage('Failed to fetch saved searches.');
      }
    };

    fetchSavedSearches();
  }, [navigate, selectedType]);

  const fetchSpeciesLocusToMhcAlleles = async (type: string, method: string) => {
    setFormLoading(true);
    try {
      const response = await axios.get(`${API_URL}/alleles?type=${encodeURIComponent(type)}&method=${encodeURIComponent(method)}`);
      setSpeciesLocusToMhcAlleles(response.data as { [key: string]: string[] });
      setFormLoading(false);
    } catch (error) {
      setErrorMessage('Failed to fetch species locus to MHC alleles.');
      setFormLoading(false);
    }
  };

  
  const handleSpeciesLocusChange = (event: SelectChangeEvent<string[]>) => {
    const selectedValues = event.target.value as string[];
    setSelectedSpeciesLocus(selectedValues);
  };
  
  useEffect(() => {
  }, [selectedSpeciesLocus]);

  const handleMethodChange = (event: SelectChangeEvent<string>) => {
    setSelectedMethod(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormLoading(true);
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries((formData as any).entries());
  
    const proteinSequences = formJson.proteinSequence.split('\n').filter((seq: string) => seq.trim() !== '');
  
    const speciesLocusArray = Array.isArray(formJson.speciesLocus) ? formJson.speciesLocus : formJson.speciesLocus.split(',');
  
    const payloads = proteinSequences.flatMap((sequence: string) =>
      selectedMhcAlleles.flatMap((allele) =>
        selectedDigits.map((length) => ({
          method: formJson.predictionMethod,
          sequence_text: sequence,
          allele,
          length,
          speciesLocus: speciesLocusArray,
        }))
      )
    );
  
    const uniquePayloads = Array.from(new Set(payloads.map((payload: any) => JSON.stringify(payload)))).map((payload) => JSON.parse(payload as string));
  
    if (selectedSearch) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/updateSavedSearch/${selectedSearch.id}`, {
          searchQuery: uniquePayloads
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setSavedSearches(savedSearches.map(search => search.id === selectedSearch.id ? { ...search, searchQuery: payloads } : search));
        handleEditClose();
      } catch (error) {
        setWarningMessage('Failed to update saved search.');
      }
    }
  
    setFormLoading(false);
  };


  const handleSearchClick = (search: Search) => {
    const uniquePayloads = Array.from(
      new Set(search.searchQuery.map((query) => JSON.stringify(query)))
    ).map((query) => JSON.parse(query));
    navigate('/results', { state: { payloads: uniquePayloads, type: search.type } });
  };

  const typeMapping: { [key in 'MHC-I' | 'MHC-II']: string } = {
    'MHC-I': 'mhci',
    'MHC-II': 'mhcii',
  };

  const reverseTypeMapping: { [key: string]: 'MHC-I' | 'MHC-II' } = {
    'mhci': 'MHC-I',
    'mhcii': 'MHC-II',
  };

  return (
    <Box
      sx={{
        padding: 2,
        border: '1px solid #ddd',
        borderRadius: 8,
        backgroundColor: '#f7f7f7',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        width: 600,
        margin: 'auto',
        marginTop: 4,
        textAlign: 'center',
      }}
    >
    <Box display="flex" justifyContent="center" alignItems="center">
      <Typography variant="h4" gutterBottom>
        Saved Searches
      </Typography>
    </Box>
      {warningMessage && (
        <Typography variant="body2" color="error" sx={{ textAlign: 'center', marginBottom: 2 }}>
          {warningMessage}
        </Typography>
      )}
      {savedSearches.map((search, searchIndex) => {
        const transformedQueries = search.searchQuery.reduce((acc: any, query: any) => {
          const { method, sequence_text, allele, length } = query;
          if (!acc[method]) {
            acc[method] = {
              sequences: new Set(),
              alleles: new Set(),
              lengths: new Set(),
            };
          }
          acc[method].sequences.add(sequence_text);
          acc[method].alleles.add(allele);
          acc[method].lengths.add(length);
          return acc;
        }, {});

        return (
          <Box key={search.id} sx={{ marginBottom: 2 }}>
            <ListItemButton onClick={() => handleSearchClick(search)}>
              <List>
                {Object.entries(transformedQueries).map(([method, details]: any, queryIndex) => (
                  <ListItem key={queryIndex}>
                    <ListItemText
                      primary={
                        <>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            <span style={{ color: 'black' }}>Type: </span> <span style={{ color: '#555' }}>{reverseTypeMapping[search.type]}</span>
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                            <span style={{ color: 'black' }}>Sequences: </span> 
                            {Array.from(details.sequences).map((sequence: string, seqIndex) => (
                              <Typography component="span" key={seqIndex} sx={{ color: '#555' }}>
                                {showMore[searchIndex] ? sequence : `${sequence.slice(0, 130)}...`}
                                <Button size="small" onClick={(event) => toggleShowMore(searchIndex, event)}>
                                  {showMore[searchIndex] ? 'Show Less' : 'Show More'}
                                </Button>
                              </Typography>
                            ))}
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            <span style={{ color: 'black' }}>Method: </span> 
                            <span style={{ color: '#555' }}>
                              {getMethodLabel(method, reverseTypeMapping[search.type])}
                            </span>
                          </Typography>
<Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
  <span style={{ color: 'black' }}>Species/Locus: </span> 
  <span style={{ color: '#555' }}>
    {Array.isArray(search.searchQuery[0].speciesLocus) ? search.searchQuery[0].speciesLocus.join(', ') : search.searchQuery[0].speciesLocus}
  </span>
</Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            <span style={{ color: 'black' }}>Alleles: </span> <span style={{ color: '#555' }}>{Array.from(details.alleles).join(', ')}</span>
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                            <span style={{ color: 'black' }}>Lengths: </span> <span style={{ color: '#555' }}>{Array.from(details.lengths).join(', ')}</span>
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </ListItemButton>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
              <IconButton color="primary" onClick={() => handleEditOpen(search)}>
                <EditIcon />
              </IconButton>
              <IconButton color="primary" onClick={(event) => handlePopoverOpen(event, search.id)}>
                <DeleteForeverIcon />
              </IconButton>
                <Popover
                open={Boolean(anchorEl) && selectedDeleteId === search.id}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                >
                  <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleDelete(search.id)}
                  sx={{ mt: 0 }}
                  >
                  <Typography variant="caption">This cannot be undone</Typography>
                  </Button>
                </Popover>
            </Box>
          </Box>
        );
      })}

      <Modal open={open} onClose={handleClose}>
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
          {modalContent && (
            <Box mt={2}>
              {(() => {
                const content = JSON.parse(modalContent);
                return (
                  <>
                    <Typography variant="body2">Method: <span style={{ color: '#555' }}>{content.method}</span></Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      Sequence: <span style={{ color: '#555' }}>{content.sequence_text}</span>
                    </Typography>
                    <Typography variant="body2">Allele: <span style={{ color: '#555' }}>{content.allele}</span></Typography>
                    <Typography variant="body2">Length: <span style={{ color: '#555' }}>{content.length}</span></Typography>
                  </>
                );
              })()}
            </Box>
          )}
          <Button onClick={handleClose} sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Modal>
<Modal open={editOpen} onClose={handleEditClose}>
  <Box
    sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 600,
      bgcolor: 'background.paper',
      border: '1px solid #ddd',
      borderRadius: 8,
      backgroundColor: '#f7f7f7',
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      p: 4,
    }}
  >
    <IconButton
      aria-label="close"
      onClick={handleEditClose}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
      }}
    >
      <CloseIcon />
    </IconButton>
    <Typography variant="h6" component="h2">
      Edit Saved Search
    </Typography>
    <form onSubmit={handleSubmit}>
      <Stack spacing={1}>
        <Stack spacing={0.5}>
          <div className="protein-sequence-container">
            <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Enter protein sequence(s), one per line</Typography>
            <TextareaAutosize
              placeholder="Protein Sequence"
              minRows={4}
              maxRows={8}
              style={{ width: '100%' }}
              name="proteinSequence"
              defaultValue={modalContent ? JSON.parse(modalContent).join('\n') : ''}
            />
          </div>
        </Stack>
        <Stack spacing={0.5}>
          <div className="prediction-method-container">
            <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Prediction Method</Typography>
            <Select
              value={selectedMethod}
              onChange={handleMethodChange}
              sx={{ height: 40, width: '100%' }}
              name="predictionMethod"
            >
              {selectedType === 'MHC-II' ? mhciiMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              )) : mhciMethods.map((method) => (
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
        </div>        
        </Stack>

        <Stack spacing={0.5}>
          <div className="mhc-alleles-container">
            <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Select MHC allele(s)</Typography>
            <Autocomplete
              multiple
              disableCloseOnSelect
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
                />
              )}
            />
          </div>
        </Stack>
        <Stack>
          <div className="length-container">
            <Typography sx={{ fontSize: 14, fontWeight: 400 }}>Select Length</Typography>
            {selectedType === 'MHC-II' ? (
              <Box display="grid" gridTemplateColumns="repeat(1, 1fr)" justifyContent="center" component="div">
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
            <input
              type="hidden"
              name="selectedLengths"
              value={selectedDigits.join(',')}
            />
          </div>
        </Stack>
        <Stack>
          {formLoading ? (
            <Button variant="contained" color="primary" disabled>
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
</Modal>

      <Modal open={!!errorMessage} onClose={() => setErrorMessage(null)}>
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
            onClick={() => setErrorMessage(null)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" component="h2" sx={{ color: 'red' }}>
            Error
          </Typography>
          <Typography variant="body2" sx={{ color: 'red' }}>
            {errorMessage}
          </Typography>
        </Box>
      </Modal>
    </Box>
  );
};

export default SavedSearches;