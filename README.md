##Project Overview

The Case Study Assessment is a dynamic React-based application designed for conducting structured case study assessments. It offers an intuitive interface for users to answer scenario-based questions while tracking progress and time spent.

##Key Features

Dynamic Scenarios and Questions: Fetch scenarios and questions based on job and company IDs from a backend service.
Real-time Progress Tracking: Visualize progress using an interactive progress bar.
Word Count & Time Tracking: Automatically calculate word count for responses and track total elapsed time during the assessment.
Response Persistence: Save user responses locally and synchronize with the backend for every question.
Submission Validation: Validate responses to ensure all questions are answered before final submission.
Confirmation Dialogs: Alert dialogs for reviewing and confirming the submission of assessments.
Responsive UI: Styled with Tailwind CSS, incorporating Framer Motion animations and Lucide icons for a polished user experience.

##Tech Stack

Frontend: React with TypeScript
UI Library: Tailwind CSS, shadcn/ui components
Animation: Framer Motion
Icons: Lucide-react
Backend Integration: REST API for fetching and submitting assessment data

##How It Works

Fetch Scenarios: The application retrieves scenario-based questions from the backend using jobId and compId.
Start Assessment: Users can begin the assessment, which initializes the timer and prepares the questions.
Save Responses: Responses are saved after each question is answered, ensuring no data is lost.
Navigate Questions: Users can navigate between questions and scenarios with previous and next buttons.
Submit Assessment: The app validates all responses, displays a confirmation dialog, and submits the assessment upon approval.
Feedback: Users receive a success message upon successful submission.
