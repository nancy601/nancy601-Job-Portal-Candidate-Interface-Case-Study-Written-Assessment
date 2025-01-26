import React from 'react';
import CaseStudyAssessment from './components/CaseStudyAssessment';

function App() {
  // In a real application, you would get these values from your authentication system
  // and job application process. For now, we'll use dummy values.
  // const jobId = 4511;
  const jobId = 6390;
  const compId = 2806;
  const username = "nancy";

  return (
    <div className="App">
      <CaseStudyAssessment 
        jobId={jobId}
        compId={compId}
        username={username} 
      />
    </div>
  );
}

export default App;