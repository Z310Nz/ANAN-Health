'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/header';
import type { Policy } from '@/lib/types';


// Helper function to parse CSV data
const parseCsv = (csvData: string): Partial<Policy>[] => {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    if (!line.trim()) return null; // Skip empty lines

    const values = line.split(',');
    const policy: Partial<Policy> & { ages: Record<string, number> } = { ages: {} };
    
    headers.forEach((header, index) => {
        const value = values[index]?.trim().replace(/"/g, '');
        if (value === undefined || value === null || value === '') return;

        if (header === 'id' || header === 'name' || header === 'segment' || header === 'Budget' || header === 'Condition') {
            policy[header] = value;
        } else if (header === 'segment_Code' || header === 'segment Code') {
            policy['segment_Code'] = value;
        } else if (!isNaN(Number(header)) && !isNaN(Number(value))) {
            // It's an age column
            policy.ages[header] = Number(value);
        }
    });

    // Only return a policy object if it has an id and a name
    if (policy.id && policy.name) {
      return policy;
    }
    return null;
  }).filter((p): p is Partial<Policy> => p !== null); // Filter out null values
};

export default function AdminPage() {
  const [maleCsv, setMaleCsv] = useState('id,name,segment,segment_Code,Budget,Condition,0,1,2,99,100');
  const [femaleCsv, setFemaleCsv] = useState('id,name,segment,segment_Code,Budget,Condition,0,1,2,99,100');
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSeed = async () => {
    if (!firestore) {
      toast({ title: 'Error', description: 'Firestore is not initialized.', variant: 'destructive' });
      return;
    }
    if (!maleCsv && !femaleCsv) {
      toast({ title: 'No data', description: 'Please provide CSV data to seed.' });
      return;
    }

    setIsLoading(true);

    try {
      const batch = writeBatch(firestore);
      let policiesSeeded = 0;

      // Process male policies
      if (maleCsv.trim().length > maleCsv.trim().split('\n')[0].length) { 
        const malePolicies = parseCsv(maleCsv);
        if (malePolicies.length > 0) {
            const maleCollectionRef = collection(firestore, 'main-policies-male');
            malePolicies.forEach(policy => {
              if (policy.id) { // Ensure policy and ID exist
                const docRef = doc(maleCollectionRef, policy.id);
                batch.set(docRef, policy);
                policiesSeeded++;
              }
            });
        }
      }

      // Process female policies
      if (femaleCsv.trim().length > femaleCsv.trim().split('\n')[0].length) { 
        const femalePolicies = parseCsv(femaleCsv);
        if (femalePolicies.length > 0) {
            const femaleCollectionRef = collection(firestore, 'main-policies-female');
            femalePolicies.forEach(policy => {
              if (policy.id) { // Ensure policy and ID exist
                const docRef = doc(femaleCollectionRef, policy.id);
                batch.set(docRef, policy);
                policiesSeeded++;
              }
            });
        }
      }

      if (policiesSeeded > 0) {
        await batch.commit();
        toast({
          title: 'Success!',
          description: `Database has been seeded with ${policiesSeeded} policy records.`,
        });
      } else {
        toast({
          title: 'No Data Seeded',
          description: 'Could not find valid policy data to import. Please check your CSV content.',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Seeding error:', error);
      toast({
        title: 'Seeding Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-primary">
        <AppHeader />
        <main className="flex flex-1 flex-col items-center pt-8">
            <Card className="w-full max-w-4xl shadow-lg border-none rounded-t-3xl mt-[-2.5rem] bg-white pt-8">
                <CardHeader>
                <CardTitle>Database Seeding Tool</CardTitle>
                <CardDescription>
                    Paste your CSV data below to populate the policy collections in Firestore.
                    The CSV header must include 'id', 'name', and any other policy fields.
                    Age-based columns (0-100) will be mapped automatically.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h3 className="font-semibold">Main Policies (Male)</h3>
                    <Textarea
                    placeholder="id,name,segment,segment_Code,Budget,Condition,0,1,2..."
                    value={maleCsv}
                    onChange={(e) => setMaleCsv(e.target.value)}
                    rows={10}
                    disabled={isLoading}
                    />
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold">Main Policies (Female)</h3>
                    <Textarea
                    placeholder="id,name,segment,segment_Code,Budget,Condition,0,1,2..."
                    value={femaleCsv}
                    onChange={(e) => setFemaleCsv(e.target.value)}
                    rows={10}
                    disabled={isLoading}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSeed} disabled={isLoading}>
                    {isLoading ? 'Seeding...' : 'Seed Database'}
                    </Button>
                </div>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
