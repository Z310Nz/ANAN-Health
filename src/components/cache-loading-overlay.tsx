import { Loader2 } from "lucide-react";

export function CacheLoadingOverlay({
  isLoading,
  message = "กำลังโหลดข้อมูล...",
}: {
  isLoading: boolean;
  message?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 max-w-sm">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-lg font-semibold text-foreground text-center">
          {message}
        </p>
        <p className="text-sm text-muted-foreground text-center">
          โปรดรอสักครู่ กำลังเตรียมข้อมูลการคำนวณ...
        </p>
      </div>
    </div>
  );
}
