'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import areasData from '@/data/areas.json';
import outletsData from '@/data/outlets.json';

export default function DashboardSelection() {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });

  const handleContinue = () => {
    router.push(`/dashboard`)
    // if (selectedArea && selectedOutlet && selectedDate) {
    //   const area = areasData.Areas.find(a => a.AreaId.toString() === selectedArea);
    //   const outlet = outletsData.Outlets.find(o => o.OutletId.toString() === selectedOutlet);
      
    //   if (area && outlet) {
    //     // Format date as DDMMYYYY to match the data file naming convention
    //     const dateParts = selectedDate.split('-');
    //     const formattedDate = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;
    //     const fileName = `${area.AreaId}_${outlet.OutletId}_${formattedDate}.json`;
    //     router.push(`/dashboard?data=${fileName}&area=${selectedArea}&outlet=${selectedOutlet}&date=${selectedDate}`);
    //   }
    // }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Cashier Reconciliation Dashboard
          </CardTitle>
          {/* <p className="text-gray-600">Select your configuration to continue</p> */}
        </CardHeader>
        <CardContent className="space-y-6">

          <Button
            onClick={handleContinue}
            className="w-full text-primary disabled:text-gray-500 bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to Dashboard
          </Button>
          <span className="text-gray-500 text-xs italic text-center block">OR</span>
          <Button
            onClick={() => router.push('/dashboard_testing')}
            className="w-full bg-white text-primary disabled:text-gray-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Custom Data Test
          </Button>
          <span className="text-gray-500 text-xs italic text-center block">OR</span>
          <Button
            onClick={() => router.push('/test-api')}
            className="w-full bg-white text-primary disabled:text-gray-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            API Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
