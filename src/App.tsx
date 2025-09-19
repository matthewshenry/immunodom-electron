import React, {useState} from 'react';
import {Routes,Route,Navigate,useLocation} from 'react-router-dom';
import Header from './Header';
import Home from './Home';
import Results from './Results';
import LoginRegister from './LoginRegister';
import SavedSearches from './SavedSearches';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import About from './About';
import './App.css';

type FormState = {
  proteinSequence: string;
  predictionMethod: string;
  speciesLocus: string;
  mhcAlleles: string[];
  selectedLengths: number[];
};

type OnFormChange = <K extends keyof FormState>(field: K, value: FormState[K]) => void;

const App:React.FC = () => {
  const [formState,setFormState] = useState<FormState>({
    proteinSequence: '',
    predictionMethod: 'netmhciipan_el',
    speciesLocus: '',
    mhcAlleles: [],
    selectedLengths: [],
  });

  const handleFormChange:OnFormChange = (field,value) => {
    setFormState(prev => ({...prev,[field]: value}));
  };

  const location = useLocation();
  const isLoginPage =
    location.pathname === '/loginregister' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';

  return (
    <div>
      {!isLoginPage && <Header/>}
      <Routes>
        {/* redirect root to About */}
        <Route path="/" element={<Navigate to="/about" replace/>}/>
        {/* dynamic type route (e.g., /mhci, /mhcii) */}
        <Route path="/:type" element={<Home formState={formState} onFormChange={handleFormChange}/>}/>
        {/* keep all-lowercase to match Header navigate() calls */}
        <Route path="/results" element={<Results/>}/>
        <Route path="/loginregister" element={<LoginRegister/>}/>
        <Route path="/savedsearches" element={<SavedSearches formState={formState} onFormChange={handleFormChange}/>}/>
        <Route path="/forgot-password" element={<ForgotPassword/>}/>
        <Route path="/reset-password" element={<ResetPassword/>}/>
        <Route path="/about" element={<About/>}/>
        {/* catch-all → about */}
        <Route path="*" element={<Navigate to="/about" replace/>}/>
      </Routes>
    </div>
  );
};

export default App;
