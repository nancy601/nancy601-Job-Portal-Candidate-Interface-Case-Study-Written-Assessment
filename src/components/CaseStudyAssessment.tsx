'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Textarea } from "./ui/textarea"
import { Progress } from "./ui/progress"
import { Clock, CheckCircle2, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"

interface Question {
  question: string;
  points: number;
  response?: string;
}

interface Scenario {
  scenario_id: number;
  scenario: string;
  questions: Question[];
}

interface CaseStudyAssessmentProps {
  jobId: number;
  compId: number;
  username: string;
}

export default function CaseStudyAssessment({ jobId, compId, username }: CaseStudyAssessmentProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [currentScenario, setCurrentScenario] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [response, setResponse] = useState("")
  const [assessmentStarted, setAssessmentStarted] = useState(false)
  const [assessmentId, setAssessmentId] = useState<number | null>(null)
  const [department, setDepartment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [assessmentSubmitted, setAssessmentSubmitted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchScenariosAndQuestions = useCallback(async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/get_scenarios_and_questions?job_id=${jobId}&comp_id=${compId}`)
      const data = await response.json()
      setScenarios(data.case_study_questions)
      setDepartment(data.department)
    } catch (error) {
      console.error('Error fetching scenarios and questions:', error)
    }
  }, [jobId, compId])

  useEffect(() => {
    if (assessmentStarted && !timerRef.current) {
      setStartTime(new Date())
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [assessmentStarted])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }

  const saveCurrentResponse = useCallback(async () => {
    if (assessmentId && response) {
      try {
        const responseData = {
          assessmentId,
          responseData: {
            [`scenario_${scenarios[currentScenario].scenario_id}`]: {
              scenarioId: scenarios[currentScenario].scenario_id,
              scenario: scenarios[currentScenario].scenario, // Add this line
              questions: [{
                questionIndex: currentQuestion,
                responseText: response,
                questionText: scenarios[currentScenario].questions[currentQuestion].question,
                points: scenarios[currentScenario].questions[currentQuestion].points,
              }]
            }
          },
          csTimeSpent: elapsedTime
        }

        setScenarios(prevScenarios => {
          const updatedScenarios = [...prevScenarios]
          updatedScenarios[currentScenario].questions[currentQuestion].response = response
          return updatedScenarios
        })

        const res = await fetch('http://127.0.0.1:5000/save_case_study_response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(responseData),
        })
        if (!res.ok) {
          throw new Error('Failed to save response')
        }
      } catch (error) {
        console.error('Error saving case study response:', error)
      }
    }
  }, [assessmentId, response, scenarios, currentScenario, currentQuestion, elapsedTime])

  const handleSubmit = useCallback(async () => {
    if (assessmentId && !isSubmitting) {
      await saveCurrentResponse()

      const hasEmptyResponses = scenarios.some((scenario, i) => 
        scenario.questions.some((question, j) => 
          !question.response || question.response.trim() === ""
        )
      )

      if (hasEmptyResponses) {
        alert("Please ensure all questions have been answered before submitting.")
        return
      }

      setShowConfirmDialog(true)
    }
  }, [assessmentId, isSubmitting, saveCurrentResponse, scenarios])

  const confirmSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('http://127.0.0.1:5000/end_assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          assessmentId,
          csTimeSpent: elapsedTime,
          endTime: new Date().toISOString()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to end assessment')
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      setAssessmentSubmitted(true)
      console.log("Assessment completed and submitted successfully")
    } catch (error) {
      console.error('Error submitting assessment:', error)
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }, [assessmentId, elapsedTime])

  const updateWordCount = useCallback((text: string) => {
    const words = text.trim().split(/\s+/)
    setWordCount(words.length === 1 && words[0] === '' ? 0 : words.length)
  }, [])

  const moveToPreviousQuestion = useCallback(async () => {
    await saveCurrentResponse()

    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    } else if (currentScenario > 0) {
      setCurrentScenario(prev => prev - 1)
      setCurrentQuestion(scenarios[currentScenario - 1].questions.length - 1)
    }

    const prevScenario = currentQuestion > 0 ? currentScenario : currentScenario - 1
    const prevQuestion = currentQuestion > 0 ? currentQuestion - 1 : scenarios[prevScenario].questions.length - 1
    const prevResponse = scenarios[prevScenario].questions[prevQuestion].response || ""
    setResponse(prevResponse)
    updateWordCount(prevResponse)
  }, [saveCurrentResponse, currentScenario, currentQuestion, scenarios, updateWordCount])

  const moveToNextQuestion = useCallback(async () => {
    // if (response.trim() === "") {
    //   alert("Please provide a response before moving to the next question.")
    //   return
    // }

    await saveCurrentResponse()

    if (currentQuestion < scenarios[currentScenario].questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setResponse(scenarios[currentScenario].questions[currentQuestion + 1].response || "")
    } else if (currentScenario < scenarios.length - 1) {
      setCurrentScenario(prev => prev + 1)
      setCurrentQuestion(0)
      setResponse(scenarios[currentScenario + 1].questions[0].response || "")
    } else {
      await handleSubmit()
    }

    updateWordCount(response)
  }, [saveCurrentResponse, scenarios, currentScenario, currentQuestion, handleSubmit, response, updateWordCount])

  useEffect(() => {
    fetchScenariosAndQuestions()
  }, [fetchScenariosAndQuestions])

  const startAssessment = useCallback(async () => {
    try {
      const startTime = new Date()
      const response = await fetch('http://127.0.0.1:5000/start_case_study_assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          jobId,
          compId,
          startTime: startTime.toISOString()
        }),
      })
      const data = await response.json()
      setAssessmentId(data.assessment_id)
      setAssessmentStarted(true)
    } catch (error) {
      console.error('Error starting assessment:', error)
    }
  }, [username, jobId, compId])

  const handleResponseChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newResponse = e.target.value
    setResponse(newResponse)
    updateWordCount(newResponse)
  }, [updateWordCount])

  const totalQuestions = scenarios?.reduce((acc, scenario) => acc + scenario.questions.length, 0) ?? 0
  const currentQuestionOverall = scenarios.slice(0, currentScenario).reduce((acc, scenario) => acc + scenario.questions.length, 0) + currentQuestion + 1
  const progress = (currentQuestionOverall / totalQuestions) * 100

  if (assessmentSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Assessment Submitted Successfully</h2>
            <p className="text-gray-600">Thank you for completing the assessment.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-6xl mx-auto shadow-xl rounded-xl overflow-hidden border-0">
        <CardHeader className="relative border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight">Case Study Assessment</h1>
              <p className="text-orange-600 font-medium">Job Assessment for {department}</p>
            </div>
            {assessmentStarted && (
              <div className="flex items-center space-x-2 bg-orange-100 rounded-full px-4 py-2">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-mono">{formatTime(elapsedTime)}</span>
              </div>
            )}
          </div>
          {assessmentStarted && (
            <div className="relative">
              <span className="absolute left -top-6 text-sm font-bold">Progress</span>
              <Progress
                value={progress}
                className="h-2 bg-orange-100"
              />
              <span className="absolute right-0 -top-6 text-sm text-orange-600 font-medium">
                Question: {currentQuestionOverall}/{totalQuestions}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6 lg:p-8 space-y-8 bg-white">
          <AnimatePresence mode="wait">
            {!assessmentStarted ? (
              <motion.div
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-center py-12"
              >
                <h2 className="text-3xl font-semibold mb-4 text-gray-800">Ready to begin?</h2>
                <p className="text-gray-600 mb-6">Take your time to read each scenario carefully and provide thoughtful responses.</p>
                <Button
                  onClick={startAssessment}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105"
                  size="lg"
                >
                  Start Assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="assessment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {scenarios.length > 0 && (
                  <>
                    <div className="bg-orange-50 border-l-4 border-orange-600 p-3 rounded-md shadow-md">
                      <h3 className="text-lg font-semibold text-orange-800">Scenario {currentScenario + 1}/{scenarios.length}</h3>
                      <p className="mt-2 text-orange-700">{scenarios[currentScenario].scenario}</p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-800">Question {currentQuestion + 1}/{scenarios[currentScenario].questions.length}</h3>
                      <p className="mt-2 text-gray-700">{scenarios[currentScenario].questions[currentQuestion].question}</p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Your Response</h3>
                      <Textarea
                        value={response}
                        onChange={handleResponseChange}
                        placeholder="Type your response here..."
                        className="mt-2 h-40 w-full border-2 border-orange-200 focus:border-orange-500 rounded-md transition-all duration-300"
                      />
                    </div>

                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-500">
                        Word count: {wordCount}
                      </div>
                      <div className="flex space-x-4">
                        <Button
                          onClick={moveToPreviousQuestion}
                          className="bg-orange-600 hover:bg-orange-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105"
                          size="lg"
                          disabled={currentScenario === 0 && currentQuestion === 0}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Previous Question
                        </Button>
                        {currentScenario === scenarios.length - 1 &&
                          currentQuestion === scenarios[currentScenario]?.questions.length - 1 ? (
                            <Button
                              onClick={handleSubmit}
                              className="bg-green-600 hover:bg-green-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105"
                              size="lg"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                              <CheckCircle2 className="h-4 w-4 ml-2 text-white-500" />
                            </Button>
                          ) : (
                            <Button
                              onClick={moveToNextQuestion}
                              className="bg-orange-600 hover:bg-orange-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105"
                              size="lg"
                            >
                              Next Question
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to submit the assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Make sure you have reviewed all your answers before submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, review answers</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>Yes, submit assessment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}