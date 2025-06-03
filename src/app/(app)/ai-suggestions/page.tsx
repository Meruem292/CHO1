'use client';

import React, { useState } from 'react';
import { AiSuggestionForm } from '@/components/forms/ai-suggestion-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getHealthSuggestions, type HealthSuggestionsOutput, type HealthSuggestionsInput } from '@/ai/flows/health-suggestion';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, PackageCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth-hook';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function AiSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<HealthSuggestionsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSubmit = async (data: HealthSuggestionsInput) => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      const result = await getHealthSuggestions(data);
      setSuggestions(result);
      toast({ title: "Suggestions Generated", description: "AI health suggestions have been successfully generated." });
    } catch (err) {
      console.error("Error getting AI suggestions:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({ variant: "destructive", title: "Error", description: `Failed to generate suggestions: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role === 'patient') {
     return (
      <div>
        <h1 className="text-2xl font-bold mb-4 font-headline">Access Denied</h1>
        <p>This tool is for medical personnel only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">AI Health Suggestions</h1>
      <p className="text-muted-foreground">
        Provide summarized medical records to receive AI-driven health intervention suggestions.
        This tool is for informational purposes and should be used by qualified medical personnel.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Input Medical Data</CardTitle>
          <CardDescription>
            Please provide concise summaries of the relevant records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiSuggestionForm onSubmit={handleSubmit} isLoading={isLoading} />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Generating Suggestions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {suggestions && suggestions.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PackageCheck className="mr-2 h-6 w-6 text-primary" />
              Generated Health Suggestions
            </CardTitle>
            <CardDescription>
              The following interventions are suggested based on the provided data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {suggestions.suggestions.map((suggestion, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center">
                      <Lightbulb className="mr-3 h-5 w-5 text-yellow-500" />
                      <span className="font-medium">{suggestion.intervention}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pl-8">
                    <strong>Rationale:</strong> {suggestion.rationale}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">
              Disclaimer: These suggestions are AI-generated and do not constitute medical advice. Always consult with a qualified healthcare professional.
            </p>
          </CardFooter>
        </Card>
      )}
      {suggestions && suggestions.suggestions.length === 0 && !isLoading && (
         <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>No Specific Suggestions</AlertTitle>
          <AlertDescription>The AI did not identify any specific interventions based on the provided data, or the data indicates a healthy status.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
