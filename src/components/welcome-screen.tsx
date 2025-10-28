'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type WelcomeScreenProps = {
    onStart: () => void;
};

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const welcomeAvatar = PlaceHolderImages.find(p => p.id === 'welcome-avatar-1');
  const mockUser = {
      displayName: 'คุณ',
      initials: 'A',
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <p className="text-muted-foreground mb-4">anan-health.co.th</p>
        <Avatar className="h-48 w-48 mb-8">
            <AvatarImage src={welcomeAvatar?.imageUrl} alt="Welcome Avatar" data-ai-hint={welcomeAvatar?.imageHint} />
            <AvatarFallback>{mockUser.initials}</AvatarFallback>
        </Avatar>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        ยินดีต้อนรับ “{mockUser.displayName}”
      </h1>
      <h2 className="text-2xl font-bold text-foreground mb-4">
        เข้าสู่ระบบคำนวณเบี้ยประกันภัย
      </h2>
      <p className="max-w-md text-sm text-red-500 mb-8">
        **ใช้เพื่อการวางแผนเท่านั้น มิใช่ข้อเสนอประกันชีวิตและสุขภาพ**
      </p>
      <Button
        size="lg"
        onClick={onStart}
        className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full px-12 py-6 text-lg"
      >
        กดเพื่อเริ่มคำนวน
      </Button>
    </div>
  );
}
