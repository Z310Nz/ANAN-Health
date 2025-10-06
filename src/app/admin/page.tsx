'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/header';

// Helper function to parse CSV data
const parseCsv = (csvData: string): { id: string; name: string }[] => {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const idIndex = headers.indexOf('id');
  const nameIndex = headers.indexOf('name');

  if (idIndex === -1 || nameIndex === -1) {
    throw new Error('CSV must have "id" and "name" columns.');
  }

  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      id: values[idIndex]?.trim(),
      name: values[nameIndex]?.trim().replace(/"/g, ''),
    };
  });
};

export default function AdminPage() {
  const [maleCsv, setMaleCsv] = useState('id,name\nmale-policy-01,"กรมธรรม์ชาย 1"\nmale-policy-02,"กรมธรรม์ชาย 2"');
  const [femaleCsv, setFemaleCsv] = useState('id,name\nfemale-policy-01,"กรมธรรม์หญิง 1"\nfemale-policy-02,"กรมธรรม์หญิง 2"');
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

      // Process male policies
      if (maleCsv) {
        const malePolicies = parseCsv(maleCsv);
        const maleCollectionRef = collection(firestore, 'main-policies-male');
        malePolicies.forEach(policy => {
          if (policy.id && policy.name) {
            const docRef = doc(maleCollectionRef, policy.id);
            batch.set(docRef, { name: policy.name });
          }
        });
      }

      // Process female policies
      if (femaleCsv) {
        const femalePolicies = parseCsv(femaleCsv);
        const femaleCollectionRef = collection(firestore, 'main-policies-female');
        femalePolicies.forEach(policy => {
          if (policy.id && policy.name) {
            const docRef = doc(femaleCollectionRef, policy.id);
            batch.set(docRef, { name: policy.name });
          }
        });
      }

      await batch.commit();

      toast({
        title: 'Success!',
        description: 'Database has been seeded with the new policy data.',
      });
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
                    The CSV must contain 'id' and 'name' columns.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h3 className="font-semibold">Main Policies (Male)</h3>
                    <Textarea
                    placeholder="id,name..."
                    value={maleCsv}
                    onChange={(e) => setMaleCsv(e.target.value)}
                    rows={5}
                    disabled={isLoading}
                    />
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold">Main Policies (Female)</h3>
                    <Textarea
                    placeholder="id,name..."
                    value={femaleCsv}
                    onChange={(e) => setFemaleCsv(e.target.value)}
                    rows={5}
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
