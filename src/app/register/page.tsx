'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { registerUser } from '@/app/actions';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const FormSchema = z.object({
  fullName: z.string().min(2, { message: 'กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง' }),
  email: z.string().email({ message: 'กรุณากรอกอีเมลให้ถูกต้อง' }),
  mobilePhone: z.string().regex(/^[0-9]{10}$/, { message: 'กรุณากรอกเบอร์มือถือ 10 หลัก' }),
});

export default function RegisterPage() {
  const { liffUser, reloadAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobilePhone: '',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (!liffUser) {
        toast({
            variant: "destructive",
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถหาข้อมูลผู้ใช้จาก LINE ได้ กรุณาลองใหม่อีกครั้ง",
        });
        return;
    }

    setIsLoading(true);
    try {
        await registerUser({
            line_id: liffUser.id,
            full_name: data.fullName,
            email: data.email,
            mobile_phone: data.mobilePhone,
            display_name: liffUser.displayName,
            picture_url: liffUser.avatarUrl,
        });

        toast({
            title: "ลงทะเบียนสำเร็จ",
            description: "ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว",
        });

        // Reload auth context to re-check registration status
        // This will cause the main router in page.tsx to show the MainApp
        reloadAuth();

    } catch (error) {
        console.error("Registration failed:", error);
        toast({
            variant: "destructive",
            title: "การลงทะเบียนล้มเหลว",
            description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง",
        });
    } finally {
        setIsLoading(false);
    }
  }
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  }


  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={liffUser?.avatarUrl} alt={liffUser?.displayName} />
                    <AvatarFallback>{getInitials(liffUser?.displayName)}</AvatarFallback>
                </Avatar>
            </div>
          <CardTitle className="text-2xl font-headline">ลงทะเบียน</CardTitle>
          <CardDescription>
            สวัสดีคุณ {liffUser?.displayName || ''}, กรุณากรอกข้อมูลเพิ่มเติมเพื่อใช้งาน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล</FormLabel>
                    <FormControl>
                      <Input placeholder="สมชาย ใจดี" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมล</FormLabel>
                    <FormControl>
                      <Input placeholder="example@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobilePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์มือถือ</FormLabel>
                    <FormControl>
                      <Input placeholder="0812345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                ลงทะเบียน
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
